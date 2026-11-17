import { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeShipmentFinancials,
  RealtimeNotification,
  Shipment,
  ShipmentStatus,
  STATUS_META,
} from '../types/shipment';

interface UseRealtimeOptions {
  onRemoteShipmentCreated: (shipment: Shipment) => void;
  onRemoteStatusUpdated: (shipment: Shipment) => void;
  onPushBanner: (notification: RealtimeNotification) => void;
}

const STORAGE_KEY_NOTIFS = 'cairo_captain_notifications_v1';

/**
 * Plays a short, pleasant two-tone Web Audio notification chime for field awareness
 */
function playNotificationChime(type: 'new_order' | 'status_changed') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'new_order') {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
    } else {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    }

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // AudioContext blocked until user interaction
  }
}

/**
 * Triggers native browser / Service Worker push notification on the Captain's device
 */
async function triggerDevicePushNotification(notif: RealtimeNotification) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(notif.title, {
          body: notif.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          dir: 'rtl',
          lang: 'ar',
          tag: notif.id,
        });
        return;
      }
    }
    new Notification(notif.title, {
      body: notif.body,
      icon: '/pwa-192x192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: notif.id,
    });
  } catch {
    // Fallback if Notification constructor is restricted in iframe
  }
}

export function useRealtimeNotifications({
  onRemoteShipmentCreated,
  onRemoteStatusUpdated,
  onPushBanner,
}: UseRealtimeOptions) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_NOTIFS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // ignore
      }
      return [
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
    }
  );

  const [wsConnected, setWsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const wsRef = useRef<WebSocket | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  const recordIncomingNotification = useCallback(
    (notif: RealtimeNotification) => {
      if (seenNotifIdsRef.current.has(notif.id)) return;
      seenNotifIdsRef.current.add(notif.id);

      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev].slice(0, 50);
      });

      if (soundEnabled) {
        playNotificationChime(notif.type);
      }
      triggerDevicePushNotification(notif);
      onPushBanner(notif);
    },
    [soundEnabled, onPushBanner]
  );

  // Connect WebSocket + BroadcastChannel
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    // BroadcastChannel for instant multi-tab sync even if offline
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('cairo_captain_realtime_channel');
      bc.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.type === 'shipment:created' && msg.shipment && msg.notification) {
          onRemoteShipmentCreated(msg.shipment);
          recordIncomingNotification(msg.notification);
        } else if (
          msg.type === 'shipment:status_updated' &&
          msg.shipment &&
          msg.notification
        ) {
          onRemoteStatusUpdated(msg.shipment);
          recordIncomingNotification(msg.notification);
        }
      };
      channelRef.current = bc;
    }

    function connectWebSocket() {
      if (isUnmounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isUnmounted) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'shipment:created' && msg.shipment && msg.notification) {
              onRemoteShipmentCreated(msg.shipment);
              recordIncomingNotification(msg.notification);
            } else if (
              msg.type === 'shipment:status_updated' &&
              msg.shipment &&
              msg.notification
            ) {
              onRemoteStatusUpdated(msg.shipment);
              recordIncomingNotification(msg.notification);
            }
          } catch {
            // ignore malformed message
          }
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            setWsConnected(false);
            reconnectTimer = setTimeout(connectWebSocket, 4000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsConnected(false);
      }
    }

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      channelRef.current?.close();
    };
  }, [
    onRemoteShipmentCreated,
    onRemoteStatusUpdated,
    recordIncomingNotification,
  ]);

  // Emit when a new shipment is created
  const notifyShipmentCreated = useCallback(
    (shipment: Shipment) => {
      const fin = computeShipmentFinancials(shipment);
      const notification: RealtimeNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'new_order',
        waybillId: shipment.id,
        title: `طلب توصيل جديد ${shipment.id}`,
        body: `استلام من ${shipment.senderName} (${shipment.pickupArea}) ⬅ تسليم إلى ${shipment.recipientName} (${shipment.deliveryArea}) — المطلوب تحصيله: ${fin.totalToCollectFromCustomer} ج.م`,
        timestamp: new Date().toISOString(),
        read: false,
        status: shipment.status,
      };

      recordIncomingNotification(notification);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'shipment:create',
            shipment,
          })
        );
      }
      channelRef.current?.postMessage({
        type: 'shipment:created',
        shipment,
        notification,
      });
    },
    [recordIncomingNotification]
  );

  // Emit when an active shipment's status changes
  const notifyStatusChanged = useCallback(
    (
      shipment: Shipment,
      oldStatus: ShipmentStatus,
      newStatus: ShipmentStatus
    ) => {
      const oldLabel = STATUS_META[oldStatus]?.label || oldStatus;
      const newLabel = STATUS_META[newStatus]?.label || newStatus;

      const notification: RealtimeNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'status_changed',
        waybillId: shipment.id,
        title: `تحديث حالة الشحنة ${shipment.id} إلى (${newLabel})`,
        body: `العميل: ${shipment.recipientName} (${shipment.deliveryArea}) — تحولت من "${oldLabel}" إلى "${newLabel}"`,
        timestamp: new Date().toISOString(),
        read: false,
        status: newStatus,
      };

      recordIncomingNotification(notification);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'shipment:update_status',
            shipmentId: shipment.id,
            newStatus,
          })
        );
      }
      channelRef.current?.postMessage({
        type: 'shipment:status_updated',
        shipment: { ...shipment, status: newStatus },
        notification,
      });
    },
    [recordIncomingNotification]
  );

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied' as NotificationPermission;
    }
    try {
      const res = await Notification.requestPermission();
      setPushPermission(res);
      return res;
    } catch {
      return 'default' as NotificationPermission;
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'notifications:mark_all_read' }));
    }
  };

  const markOneAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    wsConnected,
    soundEnabled,
    setSoundEnabled,
    pushPermission,
    requestPushPermission,
    notifyShipmentCreated,
    notifyStatusChanged,
    markAllAsRead,
    markOneAsRead,
    clearNotifications,
  };
}
