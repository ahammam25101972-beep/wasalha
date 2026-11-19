import React, { useMemo, useState } from 'react';
import {
  CairoArea,
  EGYPT_GOVERNORATES,
  EgyptGovernorate,
  formatEgyptWhatsAppNumber,
  GOVERNORATE_AREAS,
  PrefilledCustomerSelection,
  SenderType,
  Shipment,
  STATUS_META,
} from '../types/shipment';
import {
  Check,
  Compass,
  Copy,
  ExternalLink,
  Flag,
  MapPin,
  Megaphone,
  MessageCircle,
  PackagePlus,
  Phone,
  Search,
  Sparkles,
  Store,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

export interface SavedCustomerRecord {
  id: string;
  role: 'sender' | 'recipient' | 'both';
  senderType: SenderType;
  name: string;
  phone: string;
  governorate?: EgyptGovernorate;
  area: CairoArea;
  address: string;
  landmark?: string;
}

interface ClientsSearchTabProps {
  shipments: Shipment[];
  savedCustomers: SavedCustomerRecord[];
  onAddSavedCustomer: (customer: Omit<SavedCustomerRecord, 'id'>) => void;
  onStartOrderForCustomer: (selection: PrefilledCustomerSelection) => void;
  onTrackWaybill: (waybillId: string) => void;
}

type RoleFilter =
  | 'all'
  | 'sender'
  | 'recipient'
  | 'individual_sender'
  | 'merchant_sender'
  | 'vip_repeat';

type SubViewMode = 'directory' | 'acquisition_methods';

interface AggregatedCustomer {
  key: string;
  name: string;
  phone: string;
  isSender: boolean;
  isRecipient: boolean;
  senderType: SenderType;
  governorate: EgyptGovernorate;
  area: CairoArea;
  address: string;
  landmark: string;
  sentShipments: Shipment[];
  receivedShipments: Shipment[];
  totalCodVolume: number;
}

const MERCHANT_SEARCH_CATEGORIES = [
  {
    label: 'محلات ملابس وأحذية',
    query: 'محلات ملابس وأحذية وبوتيك',
    desc: 'أكثر الفئات طلباً لتوصيل الأوردرات للعملاء مع القياس والتحصيل',
  },
  {
    label: 'صيدليات ومستلزمات طبية',
    query: 'صيدليات ومستلزمات طبية',
    desc: 'تحتاج توصيل فوري للأدوية والمستلزمات لكبار السن والأهالي',
  },
  {
    label: 'مطاعم وحلواني وكافيهات',
    query: 'مطاعم وحلواني',
    desc: 'توصيل الطلبات السريعة في نطاق المنطقة والمحافظة',
  },
  {
    label: 'محلات موبايلات وإكسسوارات',
    query: 'محلات موبايلات وإلكترونيات',
    desc: 'توصيل اكسسوارات الموبايل والصيانة السريعة للعملاء',
  },
  {
    label: 'هدايا وعطور ومستحضرات تجميل',
    query: 'محلات هدايا وعطور وميكب',
    desc: 'شحن الهدايا ومستحضرات التجميل بنفس اليوم مع تحصيل COD',
  },
  {
    label: 'قطع غيار سيارات وإكسسوارات',
    query: 'قطع غيار سيارات',
    desc: 'توصيل قطع الغيار بين التجار والورش والعملاء الأفراد',
  },
];

const INDIVIDUAL_SEARCH_CHANNELS = [
  {
    label: 'جروبات أهالي وسكان المنطقة على فيسبوك',
    querySuffix: 'جروب أهالي وسكان',
    desc: 'ابحث في جروبات منطقتك أو محافظتك عن الأهالي الذين يحتاجون توصيل مشاوير وطرود شخصية',
  },
  {
    label: 'صفحات الأكل البيتي والهاندميد من المنازل',
    querySuffix: 'أكل بيتي وهاندميد وأونلاين',
    desc: 'الأفراد الذين يبيعون من المنزل ولا يملكون مندوب توصيل ثابت',
  },
  {
    label: 'تجار الأونلاين والملابس الفردية بالمحافظة',
    querySuffix: 'بيع أونلاين وتوصيل فوري',
    desc: 'الأفراد أصحاب الصفحات الصغيرة على فيسبوك وإنستجرام وواتساب',
  },
];

export const ClientsSearchTab: React.FC<ClientsSearchTabProps> = ({
  shipments,
  savedCustomers,
  onAddSavedCustomer,
  onStartOrderForCustomer,
  onTrackWaybill,
}) => {
  const [subView, setSubView] = useState<SubViewMode>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [governorateFilter, setGovernorateFilter] = useState<
    EgyptGovernorate | 'ALL'
  >('ALL');
  const [areaFilter, setAreaFilter] = useState<CairoArea | 'ALL'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Prospecting / Customer Acquisition state
  const [targetGov, setTargetGov] = useState<EgyptGovernorate>('القاهرة');
  const [targetArea, setTargetArea] = useState<string>('مدينة نصر');
  const [copiedPitchId, setCopiedPitchId] = useState<string | null>(null);
  const [customMapsKeyword, setCustomMapsKeyword] = useState<string>('');

  // Quick Google Maps Lead Capture & Instant WhatsApp Pitch State
  const [mapsLeadName, setMapsLeadName] = useState<string>('');
  const [mapsLeadPhone, setMapsLeadPhone] = useState<string>('');
  const [mapsLeadAddress, setMapsLeadAddress] = useState<string>('');
  const [mapsLeadSavedSuccess, setMapsLeadSavedSuccess] =
    useState<boolean>(false);

  // Add new customer form state
  const [newRole, setNewRole] = useState<'sender' | 'recipient'>('sender');
  const [newSenderType, setNewSenderType] =
    useState<SenderType>('individual');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGovernorate, setNewGovernorate] =
    useState<EgyptGovernorate>('القاهرة');
  const [newArea, setNewArea] = useState<CairoArea>('السيدة زينب');
  const [newAddress, setNewAddress] = useState('');
  const [newLandmark, setNewLandmark] = useState('');

  // Aggregate all unique customers (both senders & recipients) from shipments + manually saved customers
  const customers = useMemo<AggregatedCustomer[]>(() => {
    const directory: Record<string, AggregatedCustomer> = {};

    const normalizeKey = (name: string, phone: string) =>
      `${phone.replace(/\D/g, '') || name.trim().toLowerCase()}`;

    // 1. Seed from savedCustomers
    savedCustomers.forEach((sc) => {
      const k = normalizeKey(sc.name, sc.phone);
      directory[k] = {
        key: k,
        name: sc.name,
        phone: sc.phone,
        isSender: sc.role === 'sender' || sc.role === 'both',
        isRecipient: sc.role === 'recipient' || sc.role === 'both',
        senderType: sc.senderType || 'individual',
        governorate: sc.governorate || 'القاهرة',
        area: sc.area,
        address: sc.address,
        landmark: sc.landmark || '',
        sentShipments: [],
        receivedShipments: [],
        totalCodVolume: 0,
      };
    });

    // 2. Aggregate from all shipments (Senders & Recipients)
    shipments.forEach((s) => {
      const pickupGov = s.pickupGovernorate || 'القاهرة';
      const deliveryGov = s.deliveryGovernorate || 'القاهرة';

      // Sender entry
      const sKey = normalizeKey(s.senderName, s.senderPhone);
      if (!directory[sKey]) {
        directory[sKey] = {
          key: sKey,
          name: s.senderName,
          phone: s.senderPhone,
          isSender: true,
          isRecipient: false,
          senderType: s.senderType || 'merchant',
          governorate: pickupGov,
          area: s.pickupArea,
          address: s.senderAddress || `منطقة ${s.pickupArea}`,
          landmark: s.senderLandmark || '',
          sentShipments: [s],
          receivedShipments: [],
          totalCodVolume: s.codAmount,
        };
      } else {
        directory[sKey].isSender = true;
        if (s.senderType) directory[sKey].senderType = s.senderType;
        if (s.pickupGovernorate) directory[sKey].governorate = pickupGov;
        if (s.senderAddress && !directory[sKey].address) {
          directory[sKey].address = s.senderAddress;
        }
        if (s.senderLandmark && !directory[sKey].landmark) {
          directory[sKey].landmark = s.senderLandmark;
        }
        directory[sKey].sentShipments.push(s);
        directory[sKey].totalCodVolume += s.codAmount;
      }

      // Recipient entry
      const rKey = normalizeKey(s.recipientName, s.recipientPhone);
      if (!directory[rKey]) {
        directory[rKey] = {
          key: rKey,
          name: s.recipientName,
          phone: s.recipientPhone,
          isSender: false,
          isRecipient: true,
          senderType: 'individual',
          governorate: deliveryGov,
          area: s.deliveryArea,
          address: s.detailedAddress,
          landmark: s.recipientLandmark || '',
          sentShipments: [],
          receivedShipments: [s],
          totalCodVolume: s.codAmount,
        };
      } else {
        directory[rKey].isRecipient = true;
        if (s.deliveryGovernorate) directory[rKey].governorate = deliveryGov;
        if (s.detailedAddress) directory[rKey].address = s.detailedAddress;
        if (s.recipientLandmark && !directory[rKey].landmark) {
          directory[rKey].landmark = s.recipientLandmark;
        }
        directory[rKey].receivedShipments.push(s);
        directory[rKey].totalCodVolume += s.codAmount;
      }
    });

    return Object.values(directory);
  }, [shipments, savedCustomers]);

  // Filter customers based on search query, role, governorate, and area
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const totalOrders =
        c.sentShipments.length + c.receivedShipments.length;

      if (roleFilter === 'sender' && !c.isSender) return false;
      if (roleFilter === 'recipient' && !c.isRecipient) return false;
      if (
        roleFilter === 'individual_sender' &&
        (!c.isSender || c.senderType !== 'individual')
      ) {
        return false;
      }
      if (
        roleFilter === 'merchant_sender' &&
        (!c.isSender || c.senderType !== 'merchant')
      ) {
        return false;
      }
      if (roleFilter === 'vip_repeat' && totalOrders < 1) {
        return false;
      }

      if (governorateFilter !== 'ALL' && c.governorate !== governorateFilter) {
        return false;
      }

      if (areaFilter !== 'ALL' && c.area !== areaFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q);
        const matchGov = c.governorate.toLowerCase().includes(q);
        const matchArea = c.area.toLowerCase().includes(q);
        const matchAddress = c.address.toLowerCase().includes(q);
        const matchLandmark = c.landmark.toLowerCase().includes(q);
        const matchWaybill = [
          ...c.sentShipments,
          ...c.receivedShipments,
        ].some((wb) => wb.id.toLowerCase().includes(q));
        if (
          !matchName &&
          !matchPhone &&
          !matchGov &&
          !matchArea &&
          !matchAddress &&
          !matchLandmark &&
          !matchWaybill
        ) {
          return false;
        }
      }
      return true;
    });
  }, [customers, roleFilter, governorateFilter, areaFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: customers.length,
      senders: customers.filter((c) => c.isSender).length,
      recipients: customers.filter((c) => c.isRecipient).length,
      individuals: customers.filter(
        (c) => c.isSender && c.senderType === 'individual'
      ).length,
      merchants: customers.filter(
        (c) => c.isSender && c.senderType === 'merchant'
      ).length,
    };
  }, [customers]);

  const availableFilterAreas = useMemo(() => {
    if (governorateFilter === 'ALL') {
      const set = new Set<string>();
      customers.forEach((c) => set.add(c.area));
      return Array.from(set);
    }
    return GOVERNORATE_AREAS[governorateFilter] || [];
  }, [governorateFilter, customers]);

  const handleSaveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newAddress.trim()) return;

    onAddSavedCustomer({
      role: newRole,
      senderType: newSenderType,
      name: newName.trim(),
      phone: newPhone.trim(),
      governorate: newGovernorate,
      area: newArea,
      address: newAddress.trim(),
      landmark: newLandmark.trim() || undefined,
    });

    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewLandmark('');
    setShowAddModal(false);
  };

  const handleCopyPitch = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPitchId(id);
      setTimeout(() => setCopiedPitchId(null), 2500);
    } catch {
      // ignore
    }
  };

  // Ready-to-copy pitch templates customized by selected Governorate & Area
  const pitchTemplates = useMemo(() => {
    return [
      {
        id: 'merchant_pitch',
        badge: 'موجه للتجار والمحلات والصفحات الأونلاين',
        title: `رسالة عرض توصيل وتحصيل للتجار في (${targetGov} - ${targetArea})`,
        text: `السلام عليكم 🌹\nمع حضرتك خدمة *"وصلها لي"* للشحن والتوصيل الفوري في محافظة *${targetGov}* (${targetArea} وجميع المناطق والمحافظات).\n🛵 متاح استلام وتوصيل جميع أوردراتكم في نفس اليوم (Same-Day Delivery) مع:\n✅ تحصيل قيمة الأوردر نقداً (COD) وتوريد الحساب في نهاية اليوم فوراً.\n✅ متابعة لحظية لكل بوليصة والتواصل المباشر مع العميل قبل الوصول.\n✅ أسعار شحن تنافسية داخل ${targetGov} ولجميع المحافظات.\nيسعدنا التعاون معكم وتوصيل أوردرات اليوم عبر *وصلها لي*!`,
      },
      {
        id: 'individual_pitch',
        badge: 'موجه للأفراد وأهالي المنطقة',
        title: `رسالة خدمة مشاوير وطلبات أهالي (${targetGov} - ${targetArea})`,
        text: `أهلاً بكم أهالي وجيران منطقة *${targetArea} - ${targetGov}* الكرام 🛵\nمعكم خدمة *"وصلها لي"* للتوصيل السريع والمشاوير الخاصة لخدمة أهالي المنطقة:\n📦 توصيل واستلام الطرود الشخصية والأمانات والمستندات من الباب للباب.\n💊 إحضار طلبات الصيدليات، المشتريات، والطلبات المنزلية السريعة.\n🌍 شحن أي طرد من ${targetGov} إلى أي محافظة أخرى بأمان وسرعة.\nعندك حاجة عايز تبعتها؟ قول *"وصلها لي"* وتواصل معنا فون أو واتساب في أي وقت!`,
      },
      {
        id: 'facebook_group_post',
        badge: 'منشور جاهز لجروبات فيسبوك وواتساب',
        title: `بوست إعلاني للنشر في جروبات (${targetGov} / ${targetArea})`,
        text: `🔔 لكل التجار وأصحاب الصفحات الأونلاين وأهالي *${targetGov} (${targetArea})* الكرام!\nلو عندك أوردر عايز توصله النهاردة وتستلم فلوسه في نفس اليوم، أو عندك طرد شخصي ومشوار مستعجل.. خدمة *"وصلها لي"* في خدمتك! 🛵\nبنوفرلك:\n1️⃣ استلام فوري من باب البيت أو المحل في ${targetArea} وكل مناطق ${targetGov}.\n2️⃣ توصيل سريع لكافة المحافظات مع بوليصة تتبع رسمية.\n3️⃣ تحصيل (COD) وتقفيل وتوريد الحساب يومياً بانتظام.\nابعتلنا رسالة واتساب أو كلمنا وقول *"وصلها لي"* وهنوصلك في أسرع وقت! 📞`,
      },
    ];
  }, [targetGov, targetArea]);

  return (
    <div className="space-y-5">
      {/* Top Mode Switcher: Directory Search vs. Methods to Find & Acquire New Clients */}
      <div className="rounded-2xl bg-white p-3 sm:p-3.5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="grid grid-cols-1 sm:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSubView('directory')}
            className={`min-h-[40px] px-3 sm:px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subView === 'directory'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4 text-[#F97316] shrink-0" />
            <span>دليل وبحث العملاء المسجلين ({counts.all})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('acquisition_methods')}
            className={`min-h-[40px] px-3 sm:px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subView === 'acquisition_methods'
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>طرق البحث واستقطاب عملاء جدد (أفراد وتجار)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4 text-[#F97316] shrink-0" />
          <span>+ إضافة عميل جديد للدليل</span>
        </button>
      </div>

      {subView === 'acquisition_methods' ? (
        /* =====================================================================
           SUB-VIEW 2: ACTIONABLE METHODS TO FIND & ACQUIRE CUSTOMERS (INDIVIDUALS & MERCHANTS)
           ===================================================================== */
        <div className="space-y-6">
          {/* Interactive Target Governorate & Area Selector for Prospecting */}
          <section className="rounded-2xl bg-slate-900 text-white p-5 sm:p-6 border border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F97316]">
                  <Sparkles className="w-4 h-4" />
                  <span>أداة البحث الفوري عن العملاء في جميع محافظات مصر (27 محافظة)</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  كيف تبحث وتصل لعملاء شحن وتوصيل جدد (أفراد وتجار)؟
                </h2>
                <p className="text-xs text-slate-300">
                  اختر المحافظة والمنطقة المستهدفة أدناه لتفعيل أزرار البحث المباشر في خرائط جوجل وفيسبوك ونسخ رسائل التعاقد الجاهزة
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    اختر المحافظة المستهدفة:
                  </label>
                  <select
                    value={targetGov}
                    onChange={(e) => {
                      const g = e.target.value as EgyptGovernorate;
                      setTargetGov(g);
                      const areas = GOVERNORATE_AREAS[g] || ['أخرى'];
                      setTargetArea(areas[0]);
                    }}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[#F97316]"
                  >
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        محافظة {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    المنطقة / المدينة:
                  </label>
                  <select
                    value={targetArea}
                    onChange={(e) => setTargetArea(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[#F97316]"
                  >
                    {(GOVERNORATE_AREAS[targetGov] || ['أخرى']).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Method 1: Live Google Maps Merchant Finder + Custom Search + Lead Capture */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#F97316]" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  أولاً: استخراج التجار والمحلات التجارية في ({targetGov} - {targetArea}) من خرائط جوجل
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                اضغط على أي نشاط تجاري أدناه أو اكتب أي نشاط/شارع لفتح خرائط جوجل مباشرة على المحلات الموجودة في{' '}
                <strong>
                  {targetArea} ({targetGov})
                </strong>{' '}
                واستخراج أرقام الموبايل للتواصل معهم:
              </p>

              {/* Custom Google Maps Keyword Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                <input
                  type="text"
                  value={customMapsKeyword}
                  onChange={(e) => setCustomMapsKeyword(e.target.value)}
                  placeholder={`اكتب أي نشاط أو شارع (مثال: مستحضرات تجميل / مكتبات / حلواني في ${targetArea})...`}
                  className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#F97316]"
                />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${customMapsKeyword.trim() || 'محلات تجارية وصيدليات'} في ${targetArea} ${targetGov} مصر`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>فتح البحث في خرائط جوجل ({targetArea})</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MERCHANT_SEARCH_CATEGORIES.map((cat) => {
                  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${cat.query} في ${targetArea} ${targetGov} مصر`
                  )}`;
                  return (
                    <a
                      key={cat.label}
                      href={mapsSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-slate-800/90 hover:bg-slate-800 p-3.5 border border-slate-700 hover:border-[#F97316] transition-all flex flex-col justify-between gap-2 group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F97316] transition-colors">
                            {cat.label}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F97316] shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {cat.desc}
                        </p>
                      </div>
                      <div className="text-[11px] font-bold text-[#F97316] pt-1">
                        بحث في {targetArea} ({targetGov}) ⬅
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Interactive Step-by-Step Google Maps Lead Capture & Instant WhatsApp Pitch */}
              <div className="rounded-xl bg-slate-800/95 p-4 border border-orange-500/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#F97316]">
                      تحويل سريع من خرائط جوجل إلى عميل فعلي
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      وجدت محلاً أو نشاطاً على خرائط جوجل؟ الصق اسمه ورقمه هنا لحفظه ومراسلته واتساب فوراً:
                    </h4>
                  </div>
                  {mapsLeadSavedSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>تم حفظ العميل في الدليل!</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={mapsLeadName}
                    onChange={(e) => setMapsLeadName(e.target.value)}
                    placeholder="اسم المحل / النشاط من الخريطة"
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#F97316]"
                  />
                  <input
                    type="tel"
                    dir="ltr"
                    value={mapsLeadPhone}
                    onChange={(e) => setMapsLeadPhone(e.target.value)}
                    placeholder="رقم الموبايل من الخريطة (010...)"
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-num text-right text-white placeholder:text-slate-400 focus:outline-none focus:border-[#F97316]"
                  />
                  <input
                    type="text"
                    value={mapsLeadAddress}
                    onChange={(e) => setMapsLeadAddress(e.target.value)}
                    placeholder={`العنوان / الشارع في ${targetArea} (اختياري)`}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!mapsLeadName.trim() || !mapsLeadPhone.trim()) return;
                      onAddSavedCustomer({
                        role: 'sender',
                        senderType: 'merchant',
                        name: mapsLeadName.trim(),
                        phone: mapsLeadPhone.trim(),
                        governorate: targetGov,
                        area: targetArea,
                        address:
                          mapsLeadAddress.trim() ||
                          `مستخرج من خرائط جوجل - ${targetArea}`,
                      });
                      const customText = `السلام عليكم، أهلاً بإدارة *${mapsLeadName.trim()}* الكرام 🌹\nوجدنا نشاطكم المميز على خرائط جوجل في منطقة *${targetArea} (${targetGov})*.\nمعكم خدمة *"وصلها لي — أسهل توصيل"* للشحن والتوصيل الفوري 🚗\nيسعدنا استلام وتوصيل أوردرات عملائكم في نفس اليوم مع تحصيل قيمة الأوردر (COD) وتوريد الحساب يومياً بانتظام.\n📞 للتواصل الفوري وطلب مندوب: 01205132328\n🌐 www.wasalhaly.4digital.net`;
                      const waPhone = formatEgyptWhatsAppNumber(
                        mapsLeadPhone.trim()
                      );
                      window.open(
                        `https://wa.me/${waPhone}?text=${encodeURIComponent(
                          customText
                        )}`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                      setMapsLeadSavedSuccess(true);
                      setMapsLeadName('');
                      setMapsLeadPhone('');
                      setMapsLeadAddress('');
                      setTimeout(() => setMapsLeadSavedSuccess(false), 3500);
                    }}
                    className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>
                      حفظ المحل في الدليل + إرسال عرض تعاقد باسمه على واتساب فوراً
                    </span>
                  </button>

                  <a
                    href="https://www.google.com/business/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>سجّل نشاطك "وصلها لي" مجاناً على خرائط جوجل</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Method 2: Live Social & Neighborhood Group Finder for Individuals & Online Sellers */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  ثانياً: البحث عن العملاء الأفراد وأهالي المنطقة وتجار الأونلاين في ({targetGov} - {targetArea})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {INDIVIDUAL_SEARCH_CHANNELS.map((ch) => {
                  const fbSearchUrl = `https://www.facebook.com/search/top/?q=${encodeURIComponent(
                    `${ch.querySuffix} ${targetArea} ${targetGov}`
                  )}`;
                  return (
                    <a
                      key={ch.label}
                      href={fbSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-slate-800/90 hover:bg-slate-800 p-3.5 border border-slate-700 hover:border-emerald-400 transition-all flex flex-col justify-between gap-2 group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {ch.label}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {ch.desc}
                        </p>
                      </div>
                      <div className="text-[11px] font-bold text-emerald-400 pt-1">
                        فتح البحث في فيسبوك ({targetArea}) ⬅
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Ready-to-Use Pitch & Marketing Templates */}
          <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ثالثاً: قوالب رسائل جاهزة للنسخ والإرسال للعملاء (أفراد وتجار) في {targetGov}
                </h3>
                <p className="text-xs text-slate-500">
                  انسخ الرسالة بضغطة واحدة وأرسلها عبر واتساب أو انشرها في جروبات {targetArea} و{targetGov}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {pitchTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-[#EA580C]">
                      {tpl.badge}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {tpl.title}
                    </h4>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-slate-200/80 leading-relaxed">
                      {tpl.text}
                    </pre>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyPitch(tpl.id, tpl.text)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedPitchId === tpl.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>تم نسخ الرسالة بنجاح</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#F97316] shrink-0" />
                        <span>نسخ نص الرسالة</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Practical Guide: 6 Proven Ways to Build Your Client Base */}
          <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              رابعاً: 6 طرق عملية مجربة لبناء قاعدة عملاء قوية (أفراد وتجار) في أي محافظة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-900">
                  1. تحويل كل "مستلم" إلى "مُرسل" جديد
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  عند تسليم أي شحنة لمستلم في الحي، يُحفظ تلقائياً في دليل العملاء لديك. أخبره أنك متاح لتوصيل أي طلبات شخصية أو مشاوير خاصة به وبأسرته في نفس المنطقة.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-900">
                  2. التعاقد مع الصيدليات والسوبر ماركت المحلية
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  الصيدليات والمحلات في الشوارع الرئيسية تحتاج دائماً لمندوب ثقة في أوقات الذروة لتوصيل طلبات الأهالي وكبار السن في المربعات السكنية المجاورة.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-900">
                  3. استهداف تجار الأونلاين والهاندميد من المنازل
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  الأفراد الذين يبيعون ملابس، أكل بيتي، أو مشغولات يدوية من المنزل يفضلون الكابتن المستقل الذي يسلم الأوردر ويورد لهم مبلغ التحصيل (COD) في نفس اليوم.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-900">
                  4. البحث بالعلامة المميزة والشارع داخل التطبيق
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  استخدم شريط البحث في الدليل لكتابة اسم شارع أو علامة مميزة (مثل: "أمام محطة المترو" أو "شارع البحر") لمعرفة جميع العملاء المسجلين لديك في نفس المربع السكني وتجميع مشاويرهم معاً.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-900">
                  5. إرسال بوليصة واتساب الاحترافية للعميل
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  إرسال تفاصيل البوليصة ورقم التتبع عبر واتساب يعطي انطباعاً احترافياً كشركة شحن متكاملة، مما يدفع العميل لحفظ رقمك وترشيحك لجيرانه وأقاربه.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-900">
                  6. الربط بين المحافظات ومواقف الأقاليم
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  توصيل الطرود المستعجلة (أوراق رسمية، عينات تجارية، أدوية) بين المحافظات في نفس اليوم يحقق أعلى هامش ربح للكابتن مقارنة بالطرود العادية.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* =====================================================================
           SUB-VIEW 1: DIRECTORY & MULTI-METHOD CUSTOMER SEARCH (ALL 27 GOVERNORATES)
           ===================================================================== */
        <>
          {/* Header & Multi-Criteria Search Controls Card */}
          <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-[#F97316]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    بحث عملاء التوصيل (أفراد وتجار ومستلمين — جميع المحافظات)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ابحث بالاسم، رقم الهاتف، المحافظة، المنطقة، الشارع، العلامة المميزة، أو رقم البوليصة
                  </p>
                </div>
              </div>
            </div>

            {/* Search Input + Governorate Dropdown + Area Dropdown */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، الهاتف، الشارع، العلامة المميزة، أو رقم البوليصة..."
                  className="w-full min-h-[46px] pr-11 pl-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={governorateFilter}
                  onChange={(e) => {
                    setGovernorateFilter(
                      e.target.value as EgyptGovernorate | 'ALL'
                    );
                    setAreaFilter('ALL');
                  }}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  <option value="ALL">كل المحافظات (27 محافظة)</option>
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      محافظة {gov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  <option value="ALL">كل المناطق والمدن</option>
                  {availableFilterAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                الكل: مرسل ومستلم ({counts.all})
              </button>

              <button
                type="button"
                onClick={() => setRoleFilter('individual_sender')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  roleFilter === 'individual_sender'
                    ? 'bg-[#F97316] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                أفراد وأهالي ({counts.individuals})
              </button>

              <button
                type="button"
                onClick={() => setRoleFilter('merchant_sender')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  roleFilter === 'merchant_sender'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                التجار والمحلات ({counts.merchants})
              </button>

              <button
                type="button"
                onClick={() => setRoleFilter('sender')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  roleFilter === 'sender'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                كل المرسلين ({counts.senders})
              </button>

              <button
                type="button"
                onClick={() => setRoleFilter('recipient')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  roleFilter === 'recipient'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                كل المستلمين ({counts.recipients})
              </button>
            </div>
          </section>

          {/* Customer Cards Grid */}
          {filteredCustomers.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 border border-slate-200 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                لا يوجد عملاء مطابقون للبحث الحالي
              </h3>
              <p className="text-xs text-slate-500">
                جرّب البحث بكلمة أخرى، أو افتح تبويب &quot;طرق البحث واستقطاب عملاء جدد&quot; أعلاه للوصول لعملاء جدد في محافظتك.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCustomers.map((customer) => {
                const roleLabel =
                  customer.isSender && customer.isRecipient
                    ? 'مُرسل ومُستلم'
                    : customer.isSender
                    ? customer.senderType === 'individual'
                      ? 'مُرسل (فرد / أهالي)'
                      : 'مُرسل (تاجر / نشاط)'
                    : 'مُستلم';

                const allWaybills = [
                  ...customer.sentShipments,
                  ...customer.receivedShipments,
                ];

                return (
                  <article
                    key={customer.key}
                    className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Meta & Name */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-1">
                            <span className="font-bold text-[#EA580C]">
                              {roleLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-slate-800">
                              {customer.governorate} ({customer.area})
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-num" dir="ltr">
                              {customer.phone}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {customer.name}
                          </h3>
                        </div>

                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                          {customer.isSender &&
                          customer.senderType === 'merchant' ? (
                            <Store className="w-5 h-5 text-blue-600" />
                          ) : (
                            <User className="w-5 h-5 text-[#F97316]" />
                          )}
                        </div>
                      </div>

                      {/* Address & Landmark Box */}
                      <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-1.5 text-xs sm:text-sm">
                        <div className="flex items-start gap-1.5 text-slate-800 font-medium">
                          <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                          <span>
                            {customer.governorate} - {customer.area} —{' '}
                            {customer.address}
                          </span>
                        </div>
                        {customer.landmark && (
                          <div className="flex items-start gap-1.5 text-xs font-bold text-[#EA580C] pt-1 border-t border-slate-200/70">
                            <Flag className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>علامة مميزة: {customer.landmark}</span>
                          </div>
                        )}
                      </div>

                      {/* Shipment History Links */}
                      {allWaybills.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs text-slate-500">
                            سجل الشحنات ({allWaybills.length}):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {allWaybills.slice(0, 5).map((wb) => (
                              <button
                                key={`${customer.key}-${wb.id}`}
                                type="button"
                                onClick={() => onTrackWaybill(wb.id)}
                                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                              >
                                <span
                                  className="font-mono-num font-bold"
                                  dir="ltr"
                                >
                                  {wb.id}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{STATUS_META[wb.status].shortLabel}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Contact & 1-Tap New Order Actions */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`tel:${customer.phone}`}
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#F97316]" />
                          <span>اتصال مباشر</span>
                        </a>

                        <a
                          href={`https://wa.me/${formatEgyptWhatsAppNumber(
                            customer.phone
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>مراسلة واتساب</span>
                        </a>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onStartOrderForCustomer({
                              role: 'sender',
                              senderType: customer.senderType,
                              name: customer.name,
                              phone: customer.phone,
                              governorate: customer.governorate,
                              area: customer.area,
                              address: customer.address,
                              landmark: customer.landmark,
                            })
                          }
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] border border-orange-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <PackagePlus className="w-3.5 h-3.5 shrink-0" />
                          <span>+ طلب جديد كمُرسل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onStartOrderForCustomer({
                              role: 'recipient',
                              name: customer.name,
                              phone: customer.phone,
                              governorate: customer.governorate,
                              area: customer.area,
                              address: customer.address,
                              landmark: customer.landmark,
                            })
                          }
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <PackagePlus className="w-3.5 h-3.5 shrink-0" />
                          <span>+ طلب جديد كمُستلم</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add Customer Modal (Supports all 27 Governorates) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                إضافة عميل جديد لدليل العملاء (كافة المحافظات)
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[38px] min-w-[38px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRole('sender')}
                  className={`min-h-[42px] rounded-xl text-xs font-bold border cursor-pointer ${
                    newRole === 'sender'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  مُرسل (فرد أو تاجر)
                </button>
                <button
                  type="button"
                  onClick={() => setNewRole('recipient')}
                  className={`min-h-[42px] rounded-xl text-xs font-bold border cursor-pointer ${
                    newRole === 'recipient'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  مُستلم (عميل)
                </button>
              </div>

              {newRole === 'sender' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSenderType('individual')}
                    className={`min-h-[38px] rounded-lg text-xs font-bold cursor-pointer ${
                      newSenderType === 'individual'
                        ? 'bg-[#F97316] text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    فرد / أهالي المنطقة
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSenderType('merchant')}
                    className={`min-h-[38px] rounded-lg text-xs font-bold cursor-pointer ${
                      newSenderType === 'merchant'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    تاجر / نشاط تجاري
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم العميل <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="الاسم أو النشاط"
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-num text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المحافظة
                  </label>
                  <select
                    value={newGovernorate}
                    onChange={(e) => {
                      const g = e.target.value as EgyptGovernorate;
                      setNewGovernorate(g);
                      const list = GOVERNORATE_AREAS[g] || ['أخرى'];
                      setNewArea(list[0]);
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  >
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        محافظة {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المنطقة / المدينة
                  </label>
                  <select
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  >
                    {(GOVERNORATE_AREAS[newGovernorate] || ['أخرى']).map(
                      (a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العنوان التفصيلي <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="الشارع، رقم العقار، الدور..."
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  علامة مميزة للعنوان
                </label>
                <input
                  type="text"
                  value={newLandmark}
                  onChange={(e) => setNewLandmark(e.target.value)}
                  placeholder="مثال: أمام المسجد الكبير / بجوار صيدلية..."
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold cursor-pointer mt-2"
              >
                حفظ العميل في الدليل
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
