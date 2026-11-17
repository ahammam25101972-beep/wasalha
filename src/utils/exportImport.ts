import {
  CAIRO_AREAS,
  CairoArea,
  computeShipmentFinancials,
  SenderType,
  Shipment,
  ShipmentStatus,
  ShippingBearer,
  STATUS_META,
} from '../types/shipment';

/**
 * Exports shipments array as a JSON backup file
 */
export function exportShipmentsToJSON(shipments: Shipment[]) {
  const payload = {
    version: '1.1',
    exportedAt: new Date().toISOString(),
    count: shipments.length,
    shipments,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `cairo-captain-backup-${dateStr}.json`);
}

/**
 * Exports shipments as a UTF-8 BOM CSV file compatible with Microsoft Excel (Arabic RTL)
 */
export function exportShipmentsToCSV(
  shipments: Shipment[],
  filenamePrefix = 'cairo-captain-report'
) {
  const headers = [
    'رقم البوليصة',
    'تاريخ التسجيل',
    'نوع المُرسل',
    'اسم المُرسل',
    'هاتف المُرسل',
    'منطقة الاستلام',
    'عنوان المُرسل',
    'علامة مميزة للمُرسل',
    'اسم المستلم',
    'هاتف المستلم',
    'منطقة التسليم',
    'العنوان التفصيلي للمستلم',
    'علامة مميزة للمستلم',
    'رابط الموقع',
    'قيمة الأوردر (COD)',
    'تكلفة الشحن',
    'من يتحمل الشحن',
    'إجمالي المطلوب من العميل',
    'صافي مستحق المُرسل',
    'حالة الشحنة',
    'حالة التوريد للمُرسل',
    'ملاحظات',
  ];

  const escapeCSV = (val: unknown) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = shipments.map((s) => {
    const fin = computeShipmentFinancials(s);
    const senderTypeLabel =
      s.senderType === 'individual' ? 'فرد / أهالي المنطقة' : 'تاجر / نشاط تجاري';
    const bearerLabel =
      s.shippingBearer === 'recipient'
        ? 'تُضاف على المستلم'
        : 'تُخصم من حساب المُرسل';
    const statusLabel = STATUS_META[s.status]?.label || s.status;
    const settledLabel = s.merchantSettled ? 'تم التوريد' : 'غير مُورّد';
    const dateFormatted = new Date(s.createdAt).toLocaleString('ar-EG');

    return [
      s.id,
      dateFormatted,
      senderTypeLabel,
      s.senderName,
      s.senderPhone,
      s.pickupArea,
      s.senderAddress || '',
      s.senderLandmark || '',
      s.recipientName,
      s.recipientPhone,
      s.deliveryArea,
      s.detailedAddress,
      s.recipientLandmark || '',
      s.googleMapsLink || '',
      fin.codAmount,
      fin.shippingFee,
      bearerLabel,
      fin.totalToCollectFromCustomer,
      fin.netPayableToMerchant,
      statusLabel,
      settledLabel,
      s.notes || '',
    ]
      .map(escapeCSV)
      .join(',');
  });

  // Add UTF-8 BOM (\uFEFF) so Excel opens Arabic characters cleanly
  const csvContent =
    '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `${filenamePrefix}-${dateStr}.csv`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses a CSV line respecting quoted strings
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Imports shipments from either a JSON or CSV file
 */
export async function parseImportedFile(file: File): Promise<Shipment[]> {
  const text = await file.text();
  const cleanText = text.replace(/^\uFEFF/, '').trim();

  if (
    file.name.endsWith('.json') ||
    cleanText.startsWith('{') ||
    cleanText.startsWith('[')
  ) {
    const parsed = JSON.parse(cleanText);
    const list = Array.isArray(parsed) ? parsed : parsed.shipments;
    if (!Array.isArray(list)) {
      throw new Error('ملف JSON غير صالح: لم يتم العثور على قائمة الشحنات.');
    }
    return list.map(normalizeImportedShipment);
  }

  // Parse CSV
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('ملف CSV فارغ أو لا يحتوي على صفوف بيانات.');
  }

  const headerCols = parseCSVLine(lines[0]);
  const isNewFormat = headerCols.includes('عنوان المُرسل');

  const dataRows = lines.slice(1);
  return dataRows.map((line, idx) => {
    const cols = parseCSVLine(line);
    const id = cols[0] || `#SH-${1001 + idx}`;
    const numMatch = id.match(/\d+/);
    const waybillNumber = numMatch ? parseInt(numMatch[0], 10) : 1001 + idx;
    const now = new Date().toISOString();

    if (isNewFormat) {
      const senderType: SenderType = (cols[2] || '').includes('فرد')
        ? 'individual'
        : 'merchant';
      const pickupArea = (CAIRO_AREAS.includes(cols[5] as CairoArea)
        ? cols[5]
        : 'وسط البلد') as CairoArea;
      const deliveryArea = (CAIRO_AREAS.includes(cols[10] as CairoArea)
        ? cols[10]
        : 'وسط البلد') as CairoArea;
      const bearerRaw = cols[16] || '';
      const shippingBearer: ShippingBearer =
        bearerRaw.includes('التاجر') || bearerRaw.includes('المُرسل')
          ? 'merchant'
          : 'recipient';
      const statusRaw = cols[19] || '';
      let status: ShipmentStatus = 'pending';
      if (statusRaw.includes('التسليم')) status = 'delivered';
      else if (statusRaw.includes('جاري')) status = 'in_transit';
      else if (statusRaw.includes('الاستلام')) status = 'picked_up';
      else if (statusRaw.includes('مرتجع') || statusRaw.includes('ملغي'))
        status = 'returned';

      return {
        id,
        waybillNumber,
        createdAt: now,
        updatedAt: now,
        senderType,
        senderName: cols[3] || 'عميل',
        senderPhone: cols[4] || '01000000000',
        pickupArea,
        senderAddress: cols[6] || '',
        senderLandmark: cols[7] || '',
        recipientName: cols[8] || 'مستلم',
        recipientPhone: cols[9] || '01000000000',
        deliveryArea,
        detailedAddress: cols[11] || '',
        recipientLandmark: cols[12] || '',
        googleMapsLink: cols[13] || '',
        codAmount: Number(cols[14]) || 0,
        shippingFee: Number(cols[15]) || 50,
        shippingBearer,
        notes: cols[21] || '',
        status,
        statusHistory: [
          {
            status,
            timestamp: now,
            label: `تم استيراد البوليصة (${STATUS_META[status].label})`,
          },
        ],
        merchantSettled: (cols[20] || '').includes('تم التوريد'),
        isSample: false,
      };
    }

    // Legacy CSV format fallback
    const pickupArea = (CAIRO_AREAS.includes(cols[4] as CairoArea)
      ? cols[4]
      : 'وسط البلد') as CairoArea;
    const deliveryArea = (CAIRO_AREAS.includes(cols[7] as CairoArea)
      ? cols[7]
      : 'وسط البلد') as CairoArea;

    const bearerRaw = cols[12] || '';
    const shippingBearer: ShippingBearer = bearerRaw.includes('التاجر')
      ? 'merchant'
      : 'recipient';

    const statusRaw = cols[15] || '';
    let status: ShipmentStatus = 'pending';
    if (statusRaw.includes('التسليم')) status = 'delivered';
    else if (statusRaw.includes('جاري')) status = 'in_transit';
    else if (statusRaw.includes('الاستلام')) status = 'picked_up';
    else if (statusRaw.includes('مرتجع') || statusRaw.includes('ملغي'))
      status = 'returned';

    return {
      id,
      waybillNumber,
      createdAt: now,
      updatedAt: now,
      senderType: 'merchant',
      senderName: cols[2] || 'تاجر',
      senderPhone: cols[3] || '01000000000',
      pickupArea,
      senderAddress: '',
      senderLandmark: '',
      recipientName: cols[5] || 'عميل',
      recipientPhone: cols[6] || '01000000000',
      deliveryArea,
      detailedAddress: cols[8] || '',
      recipientLandmark: '',
      googleMapsLink: cols[9] || '',
      codAmount: Number(cols[10]) || 0,
      shippingFee: Number(cols[11]) || 50,
      shippingBearer,
      notes: cols[17] || '',
      status,
      statusHistory: [
        {
          status,
          timestamp: now,
          label: `تم استيراد البوليصة (${STATUS_META[status].label})`,
        },
      ],
      merchantSettled: (cols[16] || '').includes('تم التوريد'),
      isSample: false,
    };
  });
}

function normalizeImportedShipment(
  raw: Partial<Shipment>,
  idx: number
): Shipment {
  const now = new Date().toISOString();
  const id = raw.id || `#SH-${1001 + idx}`;
  const numMatch = String(id).match(/\d+/);
  const waybillNumber =
    raw.waybillNumber || (numMatch ? parseInt(numMatch[0], 10) : 1001 + idx);
  const status: ShipmentStatus =
    raw.status && STATUS_META[raw.status] ? raw.status : 'pending';

  return {
    id,
    waybillNumber,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    senderType: raw.senderType === 'individual' ? 'individual' : 'merchant',
    senderName: raw.senderName || 'عميل',
    senderPhone: raw.senderPhone || '',
    pickupArea:
      raw.pickupArea && CAIRO_AREAS.includes(raw.pickupArea)
        ? raw.pickupArea
        : 'وسط البلد',
    senderAddress: raw.senderAddress || '',
    senderLandmark: raw.senderLandmark || '',
    recipientName: raw.recipientName || 'مستلم',
    recipientPhone: raw.recipientPhone || '',
    deliveryArea:
      raw.deliveryArea && CAIRO_AREAS.includes(raw.deliveryArea)
        ? raw.deliveryArea
        : 'وسط البلد',
    detailedAddress: raw.detailedAddress || '',
    recipientLandmark: raw.recipientLandmark || '',
    googleMapsLink: raw.googleMapsLink || '',
    codAmount: Math.max(0, Number(raw.codAmount) || 0),
    shippingFee: Math.max(0, Number(raw.shippingFee) || 0),
    shippingBearer:
      raw.shippingBearer === 'merchant' ? 'merchant' : 'recipient',
    notes: raw.notes || '',
    status,
    statusHistory:
      Array.isArray(raw.statusHistory) && raw.statusHistory.length > 0
        ? raw.statusHistory
        : [
            {
              status,
              timestamp: raw.createdAt || now,
              label: STATUS_META[status].label,
            },
          ],
    merchantSettled: Boolean(raw.merchantSettled),
    settledAt: raw.settledAt,
    isSample: Boolean(raw.isSample),
  };
}
