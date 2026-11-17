import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_SAMPLE_SHIPMENTS } from './src/data/sampleShipments.ts';
import { Shipment, ShipmentStatus, STATUS_META, computeShipmentFinancials } from './src/types/shipment.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RealtimeNotification {
  id: string;
  type: 'new_order' | 'status_changed';
  waybillId: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  status?: ShipmentStatus;
}

// Server-authoritative state
let serverShipments: Shipment[] = [...INITIAL_SAMPLE_SHIPMENTS];
let serverNotifications: RealtimeNotification[] = [
  {
    id: 'notif-init-1',
    type: 'status_changed',
    waybillId: '#SH-1002',
    title: 'تحديث حالة الشحنة #SH-1002',
    body: 'الشحنة الخاصة بـ (م. سارة طارق الشافعي - المعادي) أصبحت الآن: جاري التوصيل',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    status: 'in_transit',
  },
  {
    id: 'notif-init-2',
    type: 'new_order',
    waybillId: '#SH-1003',
    title: 'طلب شحن جديد #SH-1003 جاهز للاستلام',
    body: 'من: جاليري النور للبصريات (وسط البلد) إلى: كريم عادل المنشاوي (مدينة نصر)',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    read: false,
    status: 'picked_up',
  },
];

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  function broadcast(event: Record<string, unknown>) {
    const payload = JSON.stringify(event);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  wss.on('connection', (ws) => {
    // Send initial authoritative state on connect
    ws.send(
      JSON.stringify({
        type: 'init',
        shipments: serverShipments,
        notifications: serverNotifications,
      })
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));

        if (msg.type === 'shipment:create' && msg.shipment) {
          const newShipment = msg.shipment as Shipment;
          const exists = serverShipments.some((s) => s.id === newShipment.id);
          if (!exists) {
            serverShipments = [newShipment, ...serverShipments];
            const fin = computeShipmentFinancials(newShipment);
            const notification: RealtimeNotification = {
              id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'new_order',
              waybillId: newShipment.id,
              title: `طلب توصيل جديد ${newShipment.id}`,
              body: `استلام من ${newShipment.senderName} (${newShipment.pickupArea}) ⬅ تسليم إلى ${newShipment.recipientName} (${newShipment.deliveryArea}) — المطلوب تحصيله: ${fin.totalToCollectFromCustomer} ج.م`,
              timestamp: new Date().toISOString(),
              read: false,
              status: newShipment.status,
            };
            serverNotifications = [notification, ...serverNotifications].slice(0, 50);

            broadcast({
              type: 'shipment:created',
              shipment: newShipment,
              notification,
            });
          }
        } else if (msg.type === 'shipment:update_status' && msg.shipmentId && msg.newStatus) {
          const { shipmentId, newStatus } = msg as {
            shipmentId: string;
            newStatus: ShipmentStatus;
          };
          const target = serverShipments.find((s) => s.id === shipmentId);
          if (target && target.status !== newStatus) {
            const oldStatusLabel = STATUS_META[target.status]?.label || target.status;
            const newStatusLabel = STATUS_META[newStatus]?.label || newStatus;
            const now = new Date().toISOString();
            const fin = computeShipmentFinancials(target);

            let logNote = newStatusLabel;
            if (newStatus === 'picked_up') {
              logNote = `تم الاستلام من التاجر (${target.pickupArea})`;
            } else if (newStatus === 'in_transit') {
              logNote = `خرج للتوصيل في اتجاه (${target.deliveryArea})`;
            } else if (newStatus === 'delivered') {
              logNote = `تم التسليم والتحصيل بنجاح (${fin.totalToCollectFromCustomer} ج.م)`;
            } else if (newStatus === 'returned') {
              logNote = `تم تحويل الحالة إلى مرتجع / ملغي`;
            }

            const updatedShipment: Shipment = {
              ...target,
              status: newStatus,
              updatedAt: now,
              statusHistory: [
                ...target.statusHistory,
                { status: newStatus, timestamp: now, label: logNote },
              ],
            };

            serverShipments = serverShipments.map((s) =>
              s.id === shipmentId ? updatedShipment : s
            );

            const notification: RealtimeNotification = {
              id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'status_changed',
              waybillId: updatedShipment.id,
              title: `تغيير حالة الشحنة ${updatedShipment.id} إلى (${newStatusLabel})`,
              body: `العميل: ${updatedShipment.recipientName} (${updatedShipment.deliveryArea}) — تحولت من "${oldStatusLabel}" إلى "${newStatusLabel}"`,
              timestamp: now,
              read: false,
              status: newStatus,
            };
            serverNotifications = [notification, ...serverNotifications].slice(0, 50);

            broadcast({
              type: 'shipment:status_updated',
              shipment: updatedShipment,
              notification,
            });
          }
        } else if (msg.type === 'shipments:sync' && Array.isArray(msg.shipments)) {
          serverShipments = msg.shipments;
          broadcast({
            type: 'shipments:synced',
            shipments: serverShipments,
          });
        } else if (msg.type === 'notifications:mark_all_read') {
          serverNotifications = serverNotifications.map((n) => ({ ...n, read: true }));
          broadcast({
            type: 'notifications:updated',
            notifications: serverNotifications,
          });
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    });
  });

  // REST API endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', clients: wss.clients.size });
  });

  app.get('/api/state', (_req, res) => {
    res.json({
      shipments: serverShipments,
      notifications: serverNotifications,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server & Real-time WebSocket running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
