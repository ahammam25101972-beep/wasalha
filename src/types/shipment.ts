export type EgyptGovernorate =
  | 'القاهرة'
  | 'الجيزة'
  | 'الإسكندرية'
  | 'القليوبية'
  | 'الدقهلية'
  | 'الشرقية'
  | 'الغربية'
  | 'المنوفية'
  | 'البحيرة'
  | 'كفر الشيخ'
  | 'دمياط'
  | 'بورسعيد'
  | 'الإسماعيلية'
  | 'السويس'
  | 'الفيوم'
  | 'بني سويف'
  | 'المنيا'
  | 'أسيوط'
  | 'سوهاج'
  | 'قنا'
  | 'الأقصر'
  | 'أسوان'
  | 'البحر الأحمر'
  | 'مطروح'
  | 'الوادي الجديد'
  | 'شمال سيناء'
  | 'جنوب سيناء';

export const EGYPT_GOVERNORATES: EgyptGovernorate[] = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الدقهلية',
  'الشرقية',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'مطروح',
  'الوادي الجديد',
  'شمال سيناء',
  'جنوب سيناء',
];

export type CairoArea = string;

export const CAIRO_AREAS: string[] = [
  'الحلمية الجديدة',
  'السيدة زينب',
  'وسط البلد',
  'العتبة والموسكي',
  'المنيل',
  'جاردن سيتي',
  'المقطم',
  'مدينة نصر',
  'مصر الجديدة',
  'المعادي',
  'التجمع الخامس',
  'شبرا',
  'حلوان',
  'عين شمس',
  'أخرى',
];

export const GOVERNORATE_AREAS: Record<EgyptGovernorate, string[]> = {
  'القاهرة': [
    'الحلمية الجديدة',
    'السيدة زينب',
    'وسط البلد',
    'العتبة والموسكي',
    'المنيل',
    'جاردن سيتي',
    'المقطم',
    'مدينة نصر',
    'مصر الجديدة',
    'المعادي',
    'التجمع الخامس',
    'شبرا',
    'حلوان',
    'عين شمس',
    'المرج',
    'الشروق ومدينتي',
    'أخرى',
  ],
  'الجيزة': [
    'الدقي',
    'المهندسين',
    'العجوزة',
    'الهرم',
    'فيصل',
    'حدائق الأهرام',
    '6 أكتوبر',
    'الشيخ زايد',
    'إمبابة',
    'الوراق',
    'البدرشين',
    'الحوامدية',
    'أخرى',
  ],
  'الإسكندرية': [
    'سموحة',
    'سيدي جابر',
    'محطة الرمل',
    'المنشية',
    'ميامي',
    'سيدي بشر',
    'المنتزه',
    'لوران',
    'العجمي',
    'برج العرب',
    'العامرية',
    'أخرى',
  ],
  'القليوبية': [
    'بنها',
    'شبرا الخيمة',
    'العبور',
    'قليوب',
    'القناطر الخيرية',
    'الخانكة',
    'طوخ',
    'كفر شكر',
    'أخرى',
  ],
  'الدقهلية': [
    'المنصورة',
    'طلخا',
    'ميت غمر',
    'السنبلاوين',
    'دكرنس',
    'بلقاس',
    'أجا',
    'شربين',
    'أخرى',
  ],
  'الشرقية': [
    'الزقازيق',
    'العاشر من رمضان',
    'بلبيس',
    'منيا القمح',
    'فاقوس',
    'أبو كبير',
    'ههيا',
    'أخرى',
  ],
  'الغربية': [
    'طنطا',
    'المحلة الكبرى',
    'كفر الزيات',
    'زفتى',
    'السنطة',
    'سمنود',
    'بسيون',
    'أخرى',
  ],
  'المنوفية': [
    'شبين الكوم',
    'مدينة السادات',
    'منوف',
    'أشمون',
    'قويسنا',
    'الباجور',
    'بركة السبع',
    'أخرى',
  ],
  'البحيرة': [
    'دمنهور',
    'كفر الدوار',
    'رشيد',
    'إيتاي البارود',
    'أبو حمص',
    'كوم حمادة',
    'وادي النطرون',
    'أخرى',
  ],
  'كفر الشيخ': [
    'مدينة كفر الشيخ',
    'دسوق',
    'فوه',
    'بلطيم',
    'سيدي سالم',
    'بيلا',
    'الحامول',
    'أخرى',
  ],
  'دمياط': [
    'مدينة دمياط',
    'دمياط الجديدة',
    'رأس البر',
    'فارسكور',
    'كفر سعد',
    'الزرقا',
    'أخرى',
  ],
  'بورسعيد': [
    'حي الشرق',
    'حي العرب',
    'حي المناخ',
    'حي الضواحي',
    'حي الزهور',
    'بورفؤاد',
    'أخرى',
  ],
  'الإسماعيلية': [
    'مدينة الإسماعيلية',
    'حي أول',
    'حي ثاني',
    'حي ثالث',
    'فايد',
    'القنطرة',
    'التل الكبير',
    'أخرى',
  ],
  'السويس': [
    'حي السويس',
    'حي الأربعين',
    'حي عتاقة',
    'حي فيصل',
    'حي الجناين',
    'العين السخنة',
    'أخرى',
  ],
  'الفيوم': [
    'مدينة الفيوم',
    'الفيوم الجديدة',
    'سنورس',
    'إطسا',
    'طامية',
    'إبشواي',
    'أخرى',
  ],
  'بني سويف': [
    'مدينة بني سويف',
    'بني سويف الجديدة',
    'الواسطى',
    'ناصر',
    'إهناسيا',
    'ببا',
    'الفشن',
    'أخرى',
  ],
  'المنيا': [
    'مدينة المنيا',
    'المنيا الجديدة',
    'ملوي',
    'سمالوط',
    'بني مزار',
    'مغاغة',
    'أبو قرقاص',
    'أخرى',
  ],
  'أسيوط': [
    'مدينة أسيوط',
    'أسيوط الجديدة',
    'ديروط',
    'منفلوط',
    'القوصية',
    'أبنوب',
    'أبو تيج',
    'أخرى',
  ],
  'سوهاج': [
    'مدينة سوهاج',
    'سوهاج الجديدة',
    'أخميم',
    'جرجا',
    'طهطا',
    'طما',
    'البلينا',
    'أخرى',
  ],
  'قنا': [
    'مدينة قنا',
    'نجع حمادي',
    'قوص',
    'دشنا',
    'أبو تشت',
    'فرشوط',
    'أخرى',
  ],
  'الأقصر': [
    'مدينة الأقصر',
    'الكرنك',
    'البر الغربي',
    'إسنا',
    'أرمنت',
    'الطود',
    'أخرى',
  ],
  'أسوان': [
    'مدينة أسوان',
    'أسوان الجديدة',
    'كوم أمبو',
    'إدفو',
    'دراو',
    'نصر النوبة',
    'أخرى',
  ],
  'البحر الأحمر': [
    'الغردقة',
    'الجونة',
    'سفاجا',
    'القصير',
    'مرسى علم',
    'رأس غارب',
    'أخرى',
  ],
  'مطروح': [
    'مرسى مطروح',
    'العلمين الجديدة',
    'الساحل الشمالي',
    'الحمام',
    'الضبعة',
    'سيوة',
    'أخرى',
  ],
  'الوادي الجديد': [
    'الخارجة',
    'الداخلة',
    'الفرافرة',
    'باريس',
    'بلاط',
    'أخرى',
  ],
  'شمال سيناء': [
    'العريش',
    'بئر العبد',
    'الشيخ زويد',
    'الحسنة',
    'نخل',
    'أخرى',
  ],
  'جنوب سيناء': [
    'شرم الشيخ',
    'دهب',
    'طور سيناء',
    'نويبع',
    'طابا',
    'سانت كاترين',
    'رأس سدر',
    'أخرى',
  ],
};

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export const GOVERNORATE_COORDS: Record<EgyptGovernorate, LatLngPoint> = {
  'القاهرة': { lat: 30.0444, lng: 31.2357 },
  'الجيزة': { lat: 30.0131, lng: 31.2089 },
  'الإسكندرية': { lat: 31.2001, lng: 29.9187 },
  'القليوبية': { lat: 30.466, lng: 31.1848 },
  'الدقهلية': { lat: 31.0409, lng: 31.3785 },
  'الشرقية': { lat: 30.5877, lng: 31.502 },
  'الغربية': { lat: 30.7865, lng: 31.0004 },
  'المنوفية': { lat: 30.5503, lng: 31.0106 },
  'البحيرة': { lat: 31.0364, lng: 30.4682 },
  'كفر الشيخ': { lat: 31.1107, lng: 30.9388 },
  'دمياط': { lat: 31.4175, lng: 31.8144 },
  'بورسعيد': { lat: 31.2653, lng: 32.3019 },
  'الإسماعيلية': { lat: 30.5965, lng: 32.2715 },
  'السويس': { lat: 29.9668, lng: 32.5498 },
  'الفيوم': { lat: 29.3084, lng: 30.8428 },
  'بني سويف': { lat: 29.0661, lng: 31.0994 },
  'المنيا': { lat: 28.1099, lng: 30.7503 },
  'أسيوط': { lat: 27.181, lng: 31.1837 },
  'سوهاج': { lat: 26.5569, lng: 31.6948 },
  'قنا': { lat: 26.1551, lng: 32.716 },
  'الأقصر': { lat: 25.6872, lng: 32.6396 },
  'أسوان': { lat: 24.0889, lng: 32.8998 },
  'البحر الأحمر': { lat: 27.2579, lng: 33.8116 },
  'مطروح': { lat: 31.3543, lng: 27.2373 },
  'الوادي الجديد': { lat: 25.439, lng: 30.5586 },
  'شمال سيناء': { lat: 31.1321, lng: 33.8033 },
  'جنوب سيناء': { lat: 27.9158, lng: 34.33 },
};

// Administrative district reference points across Cairo, Giza, Alexandria, and major cities
export const CAIRO_AREA_COORDS: Record<string, LatLngPoint> = {
  // القاهرة
  'وسط البلد': { lat: 30.0444, lng: 31.2357 },
  'العتبة والموسكي': { lat: 30.0521, lng: 31.2466 },
  'الحلمية الجديدة': { lat: 30.0385, lng: 31.2538 },
  'السيدة زينب': { lat: 30.0318, lng: 31.2364 },
  'جاردن سيتي': { lat: 30.0355, lng: 31.2314 },
  'المنيل': { lat: 30.0214, lng: 31.2268 },
  'المقطم': { lat: 30.0119, lng: 31.2981 },
  'المعادي': { lat: 29.9602, lng: 31.2569 },
  'مدينة نصر': { lat: 30.0561, lng: 31.3301 },
  'مصر الجديدة': { lat: 30.0909, lng: 31.3226 },
  'التجمع الخامس': { lat: 30.0074, lng: 31.4913 },
  'شبرا': { lat: 30.0778, lng: 31.2454 },
  'حلوان': { lat: 29.8414, lng: 31.3008 },
  'عين شمس': { lat: 30.1304, lng: 31.3167 },
  'المرج': { lat: 30.1521, lng: 31.3383 },
  'الشروق ومدينتي': { lat: 30.1186, lng: 31.609 },
  // الجيزة
  'الدقي': { lat: 30.0384, lng: 31.2122 },
  'المهندسين': { lat: 30.0566, lng: 31.2016 },
  'العجوزة': { lat: 30.0532, lng: 31.2131 },
  'الهرم': { lat: 29.9942, lng: 31.1606 },
  'فيصل': { lat: 30.0017, lng: 31.1695 },
  'حدائق الأهرام': { lat: 29.9696, lng: 31.1039 },
  '6 أكتوبر': { lat: 29.9737, lng: 30.9469 },
  'الشيخ زايد': { lat: 30.0442, lng: 30.9762 },
  'إمبابة': { lat: 30.0766, lng: 31.2073 },
  // الإسكندرية
  'سموحة': { lat: 31.2156, lng: 29.942 },
  'سيدي جابر': { lat: 31.2248, lng: 29.9372 },
  'محطة الرمل': { lat: 31.2012, lng: 29.8998 },
  'المنشية': { lat: 31.1976, lng: 29.8925 },
  'ميامي': { lat: 31.2683, lng: 29.9935 },
  'سيدي بشر': { lat: 31.2591, lng: 29.9854 },
  'المنتزه': { lat: 31.2885, lng: 30.0155 },
  'العجمي': { lat: 31.106, lng: 29.7661 },
  // القليوبية والدلتا والقناة والصعيد
  'بنها': { lat: 30.466, lng: 31.1848 },
  'شبرا الخيمة': { lat: 30.1286, lng: 31.2422 },
  'العبور': { lat: 30.2283, lng: 31.4799 },
  'المنصورة': { lat: 31.0409, lng: 31.3785 },
  'الزقازيق': { lat: 30.5877, lng: 31.502 },
  'العاشر من رمضان': { lat: 30.2994, lng: 31.7418 },
  'طنطا': { lat: 30.7865, lng: 31.0004 },
  'المحلة الكبرى': { lat: 30.9706, lng: 31.1669 },
  'شبين الكوم': { lat: 30.5503, lng: 31.0106 },
  'دمنهور': { lat: 31.0364, lng: 30.4682 },
  'أخرى': { lat: 30.0444, lng: 31.2357 },
};

// Geographic route order
export const AREA_ROUTE_ORDER: Record<string, number> = {
  'العتبة والموسكي': 1,
  'وسط البلد': 2,
  'الحلمية الجديدة': 3,
  'السيدة زينب': 4,
  'جاردن سيتي': 5,
  'المنيل': 6,
  'الدقي': 7,
  'المهندسين': 8,
  'الهرم': 9,
  'فيصل': 10,
  'المقطم': 11,
  'المعادي': 12,
  'مدينة نصر': 13,
  'مصر الجديدة': 14,
  'التجمع الخامس': 15,
  '6 أكتوبر': 16,
  'الشيخ زايد': 17,
  'أخرى': 99,
};

export type SenderType = 'individual' | 'merchant';

export type ShippingBearer = 'recipient' | 'merchant';

export type ShipmentStatus =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'returned';

export interface StatusLogItem {
  status: ShipmentStatus;
  timestamp: string;
  label: string;
}

export interface Shipment {
  id: string; // e.g. "#SH-1001"
  waybillNumber: number; // e.g. 1001
  createdAt: string;
  updatedAt: string;
  // Sender (Individual / Merchant / Client)
  senderType?: SenderType; // 'individual' (فرد) | 'merchant' (تاجر)
  senderName: string;
  senderPhone: string;
  pickupGovernorate?: EgyptGovernorate;
  pickupArea: CairoArea;
  senderAddress?: string;
  senderLandmark?: string;
  // Recipient
  recipientName: string;
  recipientPhone: string;
  deliveryGovernorate?: EgyptGovernorate;
  deliveryArea: CairoArea;
  detailedAddress: string;
  recipientLandmark?: string;
  googleMapsLink?: string;
  // Financials
  codAmount: number; // Order value in EGP (can be 0 for prepaid)
  shippingFee: number; // Shipping cost in EGP
  shippingBearer: ShippingBearer; // 'recipient' (added to customer) | 'merchant' (deducted from sender)
  notes?: string;
  // Execution State
  status: ShipmentStatus;
  statusHistory: StatusLogItem[];
  merchantSettled: boolean;
  settledAt?: string;
  isSample?: boolean;
}

export type ExpenseCategory = 'fuel' | 'maintenance' | 'other';

export interface DailyExpense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  createdAt: string;
  isSample?: boolean;
}

export const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; shortLabel: string; defaultDesc: string; color: string }
> = {
  fuel: {
    label: 'بنزين ووقود',
    shortLabel: 'بنزين',
    defaultDesc: 'تموين بنزين للسيارة / الموتوسيكل',
    color: 'text-[#EA580C]',
  },
  maintenance: {
    label: 'صيانة سيارة',
    shortLabel: 'صيانة سيارة',
    defaultDesc: 'صيانة دورية / غيار زيت / إطارات',
    color: 'text-rose-700',
  },
  other: {
    label: 'مصاريف أخرى',
    shortLabel: 'مصاريف أخرى',
    defaultDesc: 'كارتة طريق / ركنة / رصيد اتصالات',
    color: 'text-slate-700',
  },
};

export interface PrefilledCustomerSelection {
  role: 'sender' | 'recipient';
  senderType?: SenderType;
  name: string;
  phone: string;
  governorate?: EgyptGovernorate;
  area: CairoArea;
  address: string;
  landmark?: string;
}

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

export interface ShiftArchiveRecord {
  id: string;
  closedAt: string;
  totalShipments: number;
  deliveredCount: number;
  returnedCount: number;
  totalCashCollected: number;
  captainGrossProfit: number;
  totalExpenses?: number;
  fuelExpenses?: number;
  maintenanceExpenses?: number;
  captainNetProfit: number;
  merchantNetTotal: number;
  shipments: Shipment[];
  expenses?: DailyExpense[];
}

export const STATUS_META: Record<
  ShipmentStatus,
  {
    label: string;
    shortLabel: string;
    stepIndex: number;
    textColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  pending: {
    label: 'قيد الانتظار',
    shortLabel: 'انتظار الاستلام',
    stepIndex: 0,
    textColor: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
  },
  picked_up: {
    label: 'تم الاستلام من المُرسل',
    shortLabel: 'تم الاستلام',
    stepIndex: 1,
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  in_transit: {
    label: 'جاري التوصيل',
    shortLabel: 'جاري التوصيل',
    stepIndex: 2,
    textColor: 'text-[#EA580C]',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  delivered: {
    label: 'تم التسليم والتحصيل',
    shortLabel: 'تم التسليم',
    stepIndex: 3,
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  returned: {
    label: 'مرتجع / ملغي',
    shortLabel: 'مرتجع / ملغي',
    stepIndex: -1,
    textColor: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
};

export const PROGRESS_STEPS: ShipmentStatus[] = [
  'pending',
  'picked_up',
  'in_transit',
  'delivered',
];

const ZONE_TIER: Record<string, number> = {
  'وسط البلد': 1,
  'العتبة والموسكي': 1,
  'السيدة زينب': 1,
  'الحلمية الجديدة': 1,
  'جاردن سيتي': 1,
  'المنيل': 1,
  'شبرا': 1,
  'الدقي': 1,
  'المهندسين': 1,
  'العجوزة': 1,
  'المقطم': 2,
  'المعادي': 2,
  'مدينة نصر': 2,
  'مصر الجديدة': 2,
  'الهرم': 2,
  'فيصل': 2,
  'التجمع الخامس': 3,
  '6 أكتوبر': 3,
  'الشيخ زايد': 3,
  'حلوان': 3,
  'الشروق ومدينتي': 3,
  'أخرى': 3,
};

const GREATER_CAIRO_GOVS = new Set<string>(['القاهرة', 'الجيزة', 'القليوبية']);
const DELTA_CANAL_GOVS = new Set<string>([
  'الدقهلية',
  'الشرقية',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
]);
const NORTH_UPPER_GOVS = new Set<string>(['الفيوم', 'بني سويف', 'المنيا']);
const SOUTH_UPPER_GOVS = new Set<string>([
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
]);

export type CustomAreaRatesMap = Record<string, number>;

export function getAreaRateKey(
  governorate: EgyptGovernorate | string,
  area: string
): string {
  return `${governorate}::${area.trim()}`;
}

export const INITIAL_CUSTOM_AREA_RATES: CustomAreaRatesMap = {
  'القاهرة::وسط البلد': 45,
  'القاهرة::العتبة والموسكي': 45,
  'القاهرة::السيدة زينب': 45,
  'القاهرة::الحلمية الجديدة': 45,
  'القاهرة::جاردن سيتي': 50,
  'القاهرة::المنيل': 50,
  'القاهرة::شبرا': 50,
  'القاهرة::المقطم': 60,
  'القاهرة::المعادي': 60,
  'القاهرة::مدينة نصر': 60,
  'القاهرة::مصر الجديدة': 65,
  'القاهرة::عين شمس': 60,
  'القاهرة::حلوان': 70,
  'القاهرة::التجمع الخامس': 75,
  'القاهرة::الشروق ومدينتي': 85,
  'الجيزة::الدقي': 55,
  'الجيزة::المهندسين': 55,
  'الجيزة::العجوزة': 55,
  'الجيزة::الهرم': 65,
  'الجيزة::فيصل': 65,
  'الجيزة::حدائق الأهرام': 75,
  'الجيزة::6 أكتوبر': 80,
  'الجيزة::الشيخ زايد': 80,
  'الإسكندرية::سموحة': 50,
  'الإسكندرية::سيدي جابر': 50,
  'الإسكندرية::محطة الرمل': 50,
  'الإسكندرية::ميامي': 55,
  'الإسكندرية::سيدي بشر': 55,
  'الإسكندرية::المنتزه': 60,
  'الإسكندرية::العجمي': 70,
};

/**
 * Returns the list of areas for a governorate, merging built-in areas with any user-added custom areas
 */
export function getAreasForGovernorate(
  governorate: EgyptGovernorate,
  customAreaRates?: CustomAreaRatesMap
): string[] {
  const base = GOVERNORATE_AREAS[governorate] || ['أخرى'];
  if (!customAreaRates) return base;

  const prefix = `${governorate}::`;
  const customAreasForGov = Object.keys(customAreaRates)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length))
    .filter((areaName) => areaName && !base.includes(areaName));

  if (customAreasForGov.length === 0) return base;

  const withoutOther = base.filter((a) => a !== 'أخرى');
  return [...withoutOther, ...customAreasForGov, 'أخرى'];
}

/**
 * Calculates default shipping fee across all 27 Egyptian Governorates and districts,
 * prioritizing captain-configured custom area rates when available.
 */
export function calculateAutoShippingFee(
  pickupArea: CairoArea,
  deliveryArea: CairoArea,
  pickupGovernorate: EgyptGovernorate = 'القاهرة',
  deliveryGovernorate: EgyptGovernorate = 'القاهرة',
  customAreaRates?: CustomAreaRatesMap
): number {
  if (customAreaRates) {
    const exactKey = getAreaRateKey(deliveryGovernorate, deliveryArea);
    if (
      typeof customAreaRates[exactKey] === 'number' &&
      customAreaRates[exactKey] >= 0
    ) {
      // If inter-governorate outside Greater Cairo, add inter-governorate differential if pickup != delivery gov
      return customAreaRates[exactKey];
    }
    if (
      typeof customAreaRates[deliveryArea] === 'number' &&
      customAreaRates[deliveryArea] >= 0
    ) {
      return customAreaRates[deliveryArea];
    }
  }

  // Same Governorate
  if (pickupGovernorate === deliveryGovernorate) {
    if (pickupArea === deliveryArea && pickupArea !== 'أخرى') {
      return 40;
    }
    if (pickupGovernorate === 'القاهرة' || pickupGovernorate === 'الجيزة') {
      const tierA = ZONE_TIER[pickupArea] || 2;
      const tierB = ZONE_TIER[deliveryArea] || 2;
      if (tierA === 1 && tierB === 1) return 50;
      if (tierA === 3 || tierB === 3) return 70;
      if (tierA === 2 && tierB === 2) return 60;
      return 60;
    }
    return 50;
  }

  // Different Governorates within Greater Cairo (Cairo / Giza / Qalyubia)
  if (
    GREATER_CAIRO_GOVS.has(pickupGovernorate) &&
    GREATER_CAIRO_GOVS.has(deliveryGovernorate)
  ) {
    return 65;
  }

  // Alexandria or Delta / Canal inter-governorate
  if (
    pickupGovernorate === 'الإسكندرية' ||
    deliveryGovernorate === 'الإسكندرية'
  ) {
    return 85;
  }

  if (
    DELTA_CANAL_GOVS.has(pickupGovernorate) &&
    DELTA_CANAL_GOVS.has(deliveryGovernorate)
  ) {
    return 75;
  }

  if (
    DELTA_CANAL_GOVS.has(pickupGovernorate) ||
    DELTA_CANAL_GOVS.has(deliveryGovernorate)
  ) {
    return 85;
  }

  if (
    NORTH_UPPER_GOVS.has(pickupGovernorate) ||
    NORTH_UPPER_GOVS.has(deliveryGovernorate)
  ) {
    return 95;
  }

  if (
    SOUTH_UPPER_GOVS.has(pickupGovernorate) ||
    SOUTH_UPPER_GOVS.has(deliveryGovernorate)
  ) {
    return 115;
  }

  // Remote Governorates (Red Sea, Sinai, Matrouh, New Valley)
  return 135;
}

/**
 * Pure, deterministic financial calculation for any shipment
 */
export function computeShipmentFinancials(shipment: {
  codAmount: number;
  shippingFee: number;
  shippingBearer: ShippingBearer;
}) {
  const cod = Math.max(0, Number(shipment.codAmount) || 0);
  const fee = Math.max(0, Number(shipment.shippingFee) || 0);

  const totalToCollectFromCustomer =
    shipment.shippingBearer === 'recipient' ? cod + fee : cod;

  const netPayableToMerchant =
    shipment.shippingBearer === 'recipient' ? cod : cod - fee;

  return {
    codAmount: cod,
    shippingFee: fee,
    totalToCollectFromCustomer,
    netPayableToMerchant,
    captainProfit: fee,
  };
}

/**
 * Extracts coordinates from a Google Maps URL if present, otherwise returns coordinates for the area or governorate
 */
export function getShipmentCoordinates(shipment: Shipment): {
  pickupCoords: LatLngPoint;
  deliveryCoords: LatLngPoint;
} {
  const pickupGov = shipment.pickupGovernorate || 'القاهرة';
  const deliveryGov = shipment.deliveryGovernorate || 'القاهرة';

  const basePickup =
    CAIRO_AREA_COORDS[shipment.pickupArea] ||
    GOVERNORATE_COORDS[pickupGov] ||
    CAIRO_AREA_COORDS['وسط البلد'];

  const baseDelivery =
    CAIRO_AREA_COORDS[shipment.deliveryArea] ||
    GOVERNORATE_COORDS[deliveryGov] ||
    CAIRO_AREA_COORDS['وسط البلد'];

  const seed = (shipment.waybillNumber || 1001) % 17;
  const offsetLat = ((seed % 5) - 2) * 0.0022;
  const offsetLng = (((seed * 3) % 5) - 2) * 0.0022;

  const pickupCoords: LatLngPoint = {
    lat: basePickup.lat + offsetLat * 0.6,
    lng: basePickup.lng - offsetLng * 0.6,
  };

  let deliveryCoords: LatLngPoint = {
    lat: baseDelivery.lat + offsetLat,
    lng: baseDelivery.lng + offsetLng,
  };

  if (shipment.googleMapsLink) {
    const match = shipment.googleMapsLink.match(
      /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/
    );
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat > 20 &&
        lat < 35 &&
        lng > 24 &&
        lng < 37
      ) {
        deliveryCoords = { lat, lng };
      }
    }
  }

  return { pickupCoords, deliveryCoords };
}

/**
 * Calculates Haversine distance in kilometers between two LatLng points
 */
export function calculateDistanceKm(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng *
      sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c * 10) / 10;
}

export interface RouteStopPoint {
  id: string;
  waybillId: string;
  stopType: 'pickup' | 'delivery';
  title: string;
  subtitle: string;
  governorate: EgyptGovernorate;
  area: CairoArea;
  address: string;
  landmark?: string;
  phone: string;
  position: LatLngPoint;
  shipment: Shipment;
  distanceFromPrevKm: number;
  distanceFromCaptainKm: number;
  estimatedMinutes: number;
}

/**
 * Nearest-neighbor route optimization starting from the captain's current location.
 * Ensures pickup stops for 'pending' shipments are visited before their delivery stops.
 */
export function optimizeDeliveryRouteByProximity(
  shipments: Shipment[],
  captainPosition: LatLngPoint
): RouteStopPoint[] {
  const activeShipments = shipments.filter(
    (s) => s.status !== 'delivered' && s.status !== 'returned'
  );

  const pendingPickups: Record<string, RouteStopPoint> = {};
  const availableDeliveries: Record<string, RouteStopPoint> = {};

  activeShipments.forEach((s) => {
    const { pickupCoords, deliveryCoords } = getShipmentCoordinates(s);
    const pickupGov = s.pickupGovernorate || 'القاهرة';
    const deliveryGov = s.deliveryGovernorate || 'القاهرة';

    if (s.status === 'pending') {
      pendingPickups[s.id] = {
        id: `${s.id}-pickup`,
        waybillId: s.id,
        stopType: 'pickup',
        title: `استلام من: ${s.senderName}`,
        subtitle: `طرد للعميل ${s.recipientName} (${deliveryGov} - ${s.deliveryArea})`,
        governorate: pickupGov,
        area: s.pickupArea,
        address:
          s.senderAddress ||
          `منطقة الاستلام: ${pickupGov} - ${s.pickupArea}`,
        landmark: s.senderLandmark,
        phone: s.senderPhone,
        position: pickupCoords,
        shipment: s,
        distanceFromPrevKm: 0,
        distanceFromCaptainKm: calculateDistanceKm(
          captainPosition,
          pickupCoords
        ),
        estimatedMinutes: 0,
      };
    } else {
      availableDeliveries[s.id] = {
        id: `${s.id}-delivery`,
        waybillId: s.id,
        stopType: 'delivery',
        title: `تسليم إلى: ${s.recipientName}`,
        subtitle: `مرسل من ${s.senderName}`,
        governorate: deliveryGov,
        area: s.deliveryArea,
        address: s.detailedAddress,
        landmark: s.recipientLandmark,
        phone: s.recipientPhone,
        position: deliveryCoords,
        shipment: s,
        distanceFromPrevKm: 0,
        distanceFromCaptainKm: calculateDistanceKm(
          captainPosition,
          deliveryCoords
        ),
        estimatedMinutes: 0,
      };
    }
  });

  const orderedStops: RouteStopPoint[] = [];
  let currentPos: LatLngPoint = { ...captainPosition };

  const totalExpectedStops =
    Object.keys(pendingPickups).length * 2 +
    Object.keys(availableDeliveries).length;

  for (let step = 0; step < totalExpectedStops; step++) {
    const candidates: RouteStopPoint[] = [
      ...Object.values(pendingPickups),
      ...Object.values(availableDeliveries),
    ];
    if (candidates.length === 0) break;

    let nearest = candidates[0];
    let minDistance = calculateDistanceKm(currentPos, nearest.position);

    for (let i = 1; i < candidates.length; i++) {
      const dist = calculateDistanceKm(currentPos, candidates[i].position);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = candidates[i];
      }
    }

    const estMins = Math.max(4, Math.round(minDistance * 3.2));
    const finalizedStop: RouteStopPoint = {
      ...nearest,
      distanceFromPrevKm: minDistance,
      estimatedMinutes: estMins,
    };

    orderedStops.push(finalizedStop);
    currentPos = finalizedStop.position;

    if (nearest.stopType === 'pickup') {
      delete pendingPickups[nearest.waybillId];
      const s = nearest.shipment;
      const { deliveryCoords } = getShipmentCoordinates(s);
      const deliveryGov = s.deliveryGovernorate || 'القاهرة';
      availableDeliveries[s.id] = {
        id: `${s.id}-delivery`,
        waybillId: s.id,
        stopType: 'delivery',
        title: `تسليم إلى: ${s.recipientName}`,
        subtitle: `مرسل من ${s.senderName}`,
        governorate: deliveryGov,
        area: s.deliveryArea,
        address: s.detailedAddress,
        landmark: s.recipientLandmark,
        phone: s.recipientPhone,
        position: deliveryCoords,
        shipment: s,
        distanceFromPrevKm: 0,
        distanceFromCaptainKm: calculateDistanceKm(
          captainPosition,
          deliveryCoords
        ),
        estimatedMinutes: 0,
      };
    } else {
      delete availableDeliveries[nearest.waybillId];
    }
  }

  return orderedStops;
}

export const APP_LOGO_URL =
  '/assets/aistudio/Gemini_Generated_Image_4yf644yf644yf644_e31b0944.jpg';
export const APP_BRAND_NAME = 'وصلها لي';
export const APP_BRAND_SLOGAN = 'أسهل توصيل';
export const APP_BRAND_PHONE = '01205132328';
export const APP_BRAND_WEBSITE = 'www.wasalhaly.4digital.net';

/**
 * Formats WhatsApp waybill text for sender or customer sharing across all governorates
 */
export function formatWaybillWhatsAppText(shipment: Shipment): string {
  const fin = computeShipmentFinancials(shipment);
  const bearerText =
    shipment.shippingBearer === 'recipient'
      ? 'تُضاف على المستلم'
      : 'تُخصم من حساب المُرسل';
  const senderTypeLabel =
    shipment.senderType === 'individual' ? 'فرد / أهالي' : 'تاجر / نشاط';
  const pickupGov = shipment.pickupGovernorate || 'القاهرة';
  const deliveryGov = shipment.deliveryGovernorate || 'القاهرة';

  const lines = [
    `📦 *بوليصة شحن وتوصيل فوري - ${APP_BRAND_NAME} (${APP_BRAND_SLOGAN})*`,
    `رقم البوليصة: *${shipment.id}*`,
    `الحالة الحالية: *${STATUS_META[shipment.status].label}*`,
    `──────────────────`,
    `👤 *بيانات المُرسل (${senderTypeLabel}):*`,
    `الاسم: ${shipment.senderName}`,
    `الهاتف: ${shipment.senderPhone}`,
    `نطاق الاستلام: ${pickupGov} - ${shipment.pickupArea}`,
    shipment.senderAddress ? `عنوان الاستلام: ${shipment.senderAddress}` : '',
    shipment.senderLandmark
      ? `علامة مميزة للمُرسل: ${shipment.senderLandmark}`
      : '',
    `──────────────────`,
    `📍 *بيانات المستلم:*`,
    `الاسم: ${shipment.recipientName}`,
    `الهاتف: ${shipment.recipientPhone}`,
    `نطاق التسليم: ${deliveryGov} - ${shipment.deliveryArea}`,
    `العنوان: ${shipment.detailedAddress}`,
    shipment.recipientLandmark
      ? `علامة مميزة للمستلم: ${shipment.recipientLandmark}`
      : '',
    shipment.googleMapsLink ? `رابط الموقع: ${shipment.googleMapsLink}` : '',
    `──────────────────`,
    `💰 *التفاصيل المالية:*`,
    `قيمة الأوردر / الطرد (COD): ${fin.codAmount.toLocaleString('en-US')} ج.م`,
    `مصاريف الشحن: ${fin.shippingFee.toLocaleString('en-US')} ج.م (${bearerText})`,
    `*إجمالي المطلوب تحصيله من المستلم: ${fin.totalToCollectFromCustomer.toLocaleString('en-US')} ج.م*`,
    `صافي مستحق المُرسل: ${fin.netPayableToMerchant.toLocaleString('en-US')} ج.م`,
    shipment.notes ? `📝 ملاحظات: ${shipment.notes}` : '',
    `──────────────────`,
    `📞 *${APP_BRAND_NAME} - ${APP_BRAND_SLOGAN}:* ${APP_BRAND_PHONE}`,
    `🌐 ${APP_BRAND_WEBSITE}`,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Formats ready WhatsApp message from Captain to Customer during delivery
 */
export function formatCustomerDeliveryWhatsApp(shipment: Shipment): string {
  const fin = computeShipmentFinancials(shipment);
  const deliveryGov = shipment.deliveryGovernorate || 'القاهرة';
  const landmarkPart = shipment.recipientLandmark
    ? ` (${shipment.recipientLandmark})`
    : '';
  return `مرحباً ${shipment.recipientName}، معك كابتن *${APP_BRAND_NAME} (${APP_BRAND_SLOGAN})* للتوصيل السريع 🚗\nفي طريقي لتسليم شحنتك رقم ${shipment.id} المرسلة من (${shipment.senderName}).\n📍 العنوان المسجل: ${deliveryGov} (${shipment.deliveryArea}) - ${shipment.detailedAddress}${landmarkPart}\n💰 إجمالي المبلغ المطلوب تحصيله: *${fin.totalToCollectFromCustomer.toLocaleString('en-US')} ج.م*\n📞 للتواصل السريع: ${APP_BRAND_PHONE}\nبرجاء تأكيد التواجد أو إرسال اللوكيشن للتسليم السريع.`;
}

/**
 * Formats Egyptian phone number for WhatsApp wa.me links
 */
export function formatEgyptWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return `2${digits}`;
  return `20${digits}`;
}
