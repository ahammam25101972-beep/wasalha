import React, { useEffect, useState } from 'react';
import {
  APP_BRAND_PHONE,
  APP_BRAND_WEBSITE,
  APP_LOGO_URL,
  CairoArea,
  calculateAutoShippingFee,
  computeShipmentFinancials,
  CustomAreaRatesMap,
  EGYPT_GOVERNORATES,
  EgyptGovernorate,
  formatEgyptWhatsAppNumber,
  formatWaybillWhatsAppText,
  getAreasForGovernorate,
  GOVERNORATE_AREAS,
  PrefilledCustomerSelection,
  SenderType,
  Shipment,
  ShippingBearer,
} from '../types/shipment';
import {
  Check,
  Coins,
  Copy,
  Flag,
  MapPin,
  MessageCircle,
  PackagePlus,
  RotateCcw,
  Store,
  Truck,
  User,
  Users,
  Wallet,
} from 'lucide-react';

interface NewOrderTabProps {
  shipments: Shipment[];
  customAreaRates: CustomAreaRatesMap;
  isAdminAuthenticated: boolean;
  onOpenAreaRatesModal: () => void;
  prefilledCustomer?: PrefilledCustomerSelection | null;
  onClearPrefilledCustomer?: () => void;
  onAddShipment: (
    data: Omit<
      Shipment,
      | 'id'
      | 'waybillNumber'
      | 'createdAt'
      | 'updatedAt'
      | 'status'
      | 'statusHistory'
      | 'merchantSettled'
    >
  ) => Shipment;
  onNavigateToCaptain: () => void;
  onTrackWaybill: (waybillId: string) => void;
  showToast: (msg: string) => void;
}

const QUICK_NOTES = [
  'قابل للكسر',
  'تسليم قبل الساعة 6 مساءً',
  'الاتصال قبل الوصول بـ 15 دقيقة',
  'طرد شخصي / مستندات هامة',
  'مسموح بالمعاينة بحضور المندوب',
  'طلبات منزلية وأهالي',
];

export const NewOrderTab: React.FC<NewOrderTabProps> = ({
  shipments,
  customAreaRates,
  isAdminAuthenticated,
  onOpenAreaRatesModal,
  prefilledCustomer,
  onClearPrefilledCustomer,
  onAddShipment,
  onNavigateToCaptain,
  onTrackWaybill,
  showToast,
}) => {
  // Sender state (Supports both Individuals & Merchants across all 27 Governorates)
  const [senderType, setSenderType] = useState<SenderType>('individual');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [pickupGovernorate, setPickupGovernorate] =
    useState<EgyptGovernorate>('القاهرة');
  const [pickupArea, setPickupArea] = useState<CairoArea>('السيدة زينب');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderLandmark, setSenderLandmark] = useState('');

  // Recipient state
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryGovernorate, setDeliveryGovernorate] =
    useState<EgyptGovernorate>('القاهرة');
  const [deliveryArea, setDeliveryArea] = useState<CairoArea>('مدينة نصر');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [recipientLandmark, setRecipientLandmark] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');

  // Financials state
  const [codAmountStr, setCodAmountStr] = useState('350');
  const [shippingFeeStr, setShippingFeeStr] = useState('60');
  const [isFeeManuallyEdited, setIsFeeManuallyEdited] = useState(false);
  const [shippingBearer, setShippingBearer] =
    useState<ShippingBearer>('recipient');
  const [notes, setNotes] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [createdWaybill, setCreatedWaybill] = useState<Shipment | null>(null);
  const [copiedWaybill, setCopiedWaybill] = useState(false);

  // Apply prefilled customer from the Customers Search page if provided
  useEffect(() => {
    if (!prefilledCustomer) return;
    const gov = prefilledCustomer.governorate || 'القاهرة';
    if (prefilledCustomer.role === 'sender') {
      if (prefilledCustomer.senderType) {
        setSenderType(prefilledCustomer.senderType);
      }
      setSenderName(prefilledCustomer.name);
      setSenderPhone(prefilledCustomer.phone);
      setPickupGovernorate(gov);
      setPickupArea(prefilledCustomer.area);
      setSenderAddress(prefilledCustomer.address || '');
      setSenderLandmark(prefilledCustomer.landmark || '');
    } else {
      setRecipientName(prefilledCustomer.name);
      setRecipientPhone(prefilledCustomer.phone);
      setDeliveryGovernorate(gov);
      setDeliveryArea(prefilledCustomer.area);
      setDetailedAddress(prefilledCustomer.address || '');
      setRecipientLandmark(prefilledCustomer.landmark || '');
    }
    onClearPrefilledCustomer?.();
  }, [prefilledCustomer, onClearPrefilledCustomer]);

  // Auto-calculate shipping cost when pickup or delivery governorate/area or customAreaRates changes
  useEffect(() => {
    if (!isFeeManuallyEdited) {
      const autoFee = calculateAutoShippingFee(
        pickupArea,
        deliveryArea,
        pickupGovernorate,
        deliveryGovernorate,
        customAreaRates
      );
      setShippingFeeStr(String(autoFee));
    }
  }, [
    pickupArea,
    deliveryArea,
    pickupGovernorate,
    deliveryGovernorate,
    customAreaRates,
    isFeeManuallyEdited,
  ]);

  // Unique existing senders (individuals & merchants) for 1-tap auto-fill
  const existingSenders = React.useMemo(() => {
    const recordMap: Record<
      string,
      {
        type: SenderType;
        name: string;
        phone: string;
        governorate: EgyptGovernorate;
        area: CairoArea;
        address: string;
        landmark: string;
      }
    > = {};
    shipments.forEach((s) => {
      const key = `${s.senderName}-${s.senderPhone}`;
      if (!recordMap[key] && s.senderName) {
        recordMap[key] = {
          type: s.senderType || 'merchant',
          name: s.senderName,
          phone: s.senderPhone,
          governorate: s.pickupGovernorate || 'القاهرة',
          area: s.pickupArea,
          address: s.senderAddress || '',
          landmark: s.senderLandmark || '',
        };
      }
    });
    return Object.values(recordMap).slice(0, 6);
  }, [shipments]);

  const codAmount = Math.max(0, Number(codAmountStr) || 0);
  const shippingFee = Math.max(0, Number(shippingFeeStr) || 0);

  const liveFinancials = computeShipmentFinancials({
    codAmount,
    shippingFee,
    shippingBearer,
  });

  const handleResetAutoFee = () => {
    setIsFeeManuallyEdited(false);
    const autoFee = calculateAutoShippingFee(
      pickupArea,
      deliveryArea,
      pickupGovernorate,
      deliveryGovernorate,
      customAreaRates
    );
    setShippingFeeStr(String(autoFee));
  };

  const handleAppendQuickNote = (noteText: string) => {
    if (notes.includes(noteText)) return;
    setNotes((prev) =>
      prev.trim() ? `${prev.trim()} ، ${noteText}` : noteText
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!senderName.trim() || !senderPhone.trim() || !senderAddress.trim()) {
      setFormError(
        'برجاء إدخال اسم المُرسل ورقم هاتفه وعنوان الاستلام بالتفصيل.'
      );
      return;
    }
    if (
      !recipientName.trim() ||
      !recipientPhone.trim() ||
      !detailedAddress.trim()
    ) {
      setFormError('برجاء إدخال اسم المستلم ورقم هاتفه والعنوان التفصيلي.');
      return;
    }

    const created = onAddShipment({
      senderType,
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      pickupGovernorate,
      pickupArea,
      senderAddress: senderAddress.trim(),
      senderLandmark: senderLandmark.trim() || undefined,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      deliveryGovernorate,
      deliveryArea,
      detailedAddress: detailedAddress.trim(),
      recipientLandmark: recipientLandmark.trim() || undefined,
      googleMapsLink: googleMapsLink.trim() || undefined,
      codAmount,
      shippingFee,
      shippingBearer,
      notes: notes.trim() || undefined,
    });

    setCreatedWaybill(created);
    setCopiedWaybill(false);
    showToast(`تم إصدار البوليصة ${created.id} بنجاح`);
  };

  const handleCopyAndWhatsApp = async (
    shipment: Shipment,
    openWaTarget: 'captain' | 'sender' | 'none'
  ) => {
    const text = formatWaybillWhatsAppText(shipment);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWaybill(true);
      showToast('تم نسخ تفاصيل البوليصة إلى الحافظة');
    } catch {
      // ignore
    }

    if (openWaTarget === 'captain') {
      const captainWa = formatEgyptWhatsAppNumber(APP_BRAND_PHONE);
      const waUrl = `https://wa.me/${captainWa}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } else if (openWaTarget === 'sender') {
      const waPhone = formatEgyptWhatsAppNumber(shipment.senderPhone);
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleStartNewForm = () => {
    setCreatedWaybill(null);
    setRecipientName('');
    setRecipientPhone('');
    setDetailedAddress('');
    setRecipientLandmark('');
    setGoogleMapsLink('');
    setCodAmountStr('350');
    setNotes('');
    setIsFeeManuallyEdited(false);
  };

  const pickupAreasList = getAreasForGovernorate(
    pickupGovernorate,
    customAreaRates
  );
  const deliveryAreasList = getAreasForGovernorate(
    deliveryGovernorate,
    customAreaRates
  );

  return (
    <div className="space-y-6">
      {/* Created Waybill Summary Banner / Modal Card */}
      {createdWaybill && (
        <div className="rounded-2xl bg-slate-900 text-white p-5 sm:p-6 shadow-lg border border-slate-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <img
                src={APP_LOGO_URL}
                alt="شعار وصلها لي - أسهل توصيل"
                className="w-14 h-14 rounded-full object-cover border-2 border-[#F97316] bg-white shadow-md shrink-0"
              />
              <div>
                <div className="text-xs text-emerald-400 font-semibold">
                  وصلها لي (أسهل توصيل) · تم تسجيل طلب الشحن وإصدار البوليصة بنجاح
                </div>
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <span>بوليصة رقم</span>
                  <span className="font-mono-num text-[#F97316]" dir="ltr">
                    {createdWaybill.id}
                  </span>
                </h2>
                <div className="text-[11px] text-slate-400 font-mono-num" dir="ltr">
                  {APP_BRAND_PHONE} · {APP_BRAND_WEBSITE}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onTrackWaybill(createdWaybill.id)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              تتبع حالة الشحنة
            </button>
          </div>

          {/* Summary Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-slate-800/70 p-4 space-y-1.5 border border-slate-700/60">
              <div className="text-xs text-slate-400">
                بيانات المُرسل (
                {createdWaybill.senderType === 'individual'
                  ? 'فرد / أهالي المنطقة'
                  : 'تاجر / نشاط'}
                )
              </div>
              <div className="font-bold text-white">
                {createdWaybill.senderName}
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className="font-mono-num" dir="ltr">
                  {createdWaybill.senderPhone}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  استلام: {createdWaybill.pickupGovernorate || 'القاهرة'} -{' '}
                  {createdWaybill.pickupArea}
                </span>
              </div>
              {createdWaybill.senderAddress && (
                <div className="text-xs text-slate-300 pt-1">
                  العنوان: {createdWaybill.senderAddress}
                </div>
              )}
              {createdWaybill.senderLandmark && (
                <div className="text-xs text-[#F97316] font-semibold">
                  علامة مميزة: {createdWaybill.senderLandmark}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-slate-800/70 p-4 space-y-1.5 border border-slate-700/60">
              <div className="text-xs text-slate-400">بيانات المستلم</div>
              <div className="font-bold text-white">
                {createdWaybill.recipientName}
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className="font-mono-num" dir="ltr">
                  {createdWaybill.recipientPhone}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  تسليم: {createdWaybill.deliveryGovernorate || 'القاهرة'} -{' '}
                  {createdWaybill.deliveryArea}
                </span>
              </div>
              <div className="text-xs text-slate-300 pt-1">
                العنوان: {createdWaybill.detailedAddress}
              </div>
              {createdWaybill.recipientLandmark && (
                <div className="text-xs text-[#F97316] font-semibold">
                  علامة مميزة: {createdWaybill.recipientLandmark}
                </div>
              )}
            </div>
          </div>

          {/* Financial Highlights */}
          {(() => {
            const fin = computeShipmentFinancials(createdWaybill);
            return (
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-950/70 p-4 border border-slate-800 text-center">
                <div>
                  <div className="text-[11px] text-slate-400">
                    قيمة التحصيل (COD)
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono-num text-white mt-0.5">
                    {fin.codAmount.toLocaleString('en-US')} ج.م
                  </div>
                </div>
                <div className="border-x border-slate-800 px-2">
                  <div className="text-[11px] text-slate-400">
                    الشحن (
                    {createdWaybill.shippingBearer === 'recipient'
                      ? 'على المستلم'
                      : 'على المُرسل'}
                    )
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono-num text-[#F97316] mt-0.5">
                    {fin.shippingFee.toLocaleString('en-US')} ج.م
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-400 font-semibold">
                    المطلوب من المستلم
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono-num text-emerald-400 mt-0.5">
                    {fin.totalToCollectFromCustomer.toLocaleString('en-US')} ج.م
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleCopyAndWhatsApp(createdWaybill, 'captain')}
              className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <span>
                إرسال البوليصة للكابتن عبر واتساب ({APP_BRAND_PHONE})
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyAndWhatsApp(createdWaybill, 'none')}
              className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiedWaybill ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تم نسخ البوليصة</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>نسخ تفاصيل البوليصة</span>
                </>
              )}
            </button>

            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={onNavigateToCaptain}
                className="min-h-[48px] px-4 py-3 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Truck className="w-4 h-4 shrink-0" />
                <span>الذهاب للوحة الكابتن</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStartNewForm}
              className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors cursor-pointer"
            >
              تسجيل طلب شحن آخر
            </button>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Right Column (7 cols on desktop): Sender & Recipient Info */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Sender (Neighborhood Individual OR Merchant across All Governorates) */}
            <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    {senderType === 'individual' ? (
                      <Users className="w-4 h-4 text-[#F97316]" />
                    ) : (
                      <Store className="w-4 h-4 text-[#F97316]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      1. بيانات المُرسل (أفراد أو تجار - كافة المحافظات)
                    </h2>
                    <p className="text-xs text-slate-500">
                      أدخل بياناتك وعنوان استلام الطرد والعلامة المميزة ليصلك الكابتن بسهولة
                    </p>
                  </div>
                </div>

                {/* Sender Type Segmented Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSenderType('individual')}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      senderType === 'individual'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    فرد / أهالي المنطقة
                  </button>
                  <button
                    type="button"
                    onClick={() => setSenderType('merchant')}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      senderType === 'merchant'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    تاجر / محل تجاري
                  </button>
                </div>
              </div>

              {/* Quick Fill from Existing Senders (Admin Only for Customer Privacy) */}
              {isAdminAuthenticated && existingSenders.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-500 font-medium">
                    اختيار سريع لمُرسل مسجل مسبقاً (خاص بلوحة الإدارة):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {existingSenders.map((m) => (
                      <button
                        key={`${m.name}-${m.phone}`}
                        type="button"
                        onClick={() => {
                          setSenderType(m.type);
                          setSenderName(m.name);
                          setSenderPhone(m.phone);
                          setPickupGovernorate(m.governorate);
                          setPickupArea(m.area);
                          setSenderAddress(m.address);
                          setSenderLandmark(m.landmark);
                        }}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {m.name} · {m.governorate} ({m.area})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {senderType === 'individual'
                      ? 'اسم المُرسل (فرد / عميل)'
                      : 'اسم التاجر / المحل'}{' '}
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder={
                      senderType === 'individual'
                        ? 'مثال: أ. محمد حسن / مدام هدى'
                        : 'مثال: جاليري النور / صيدلية الشفاء'
                    }
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم هاتف المُرسل <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono-num text-right text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                </div>
              </div>

              {/* Governorate + Area of Pickup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    محافظة الاستلام <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={pickupGovernorate}
                    onChange={(e) => {
                      const nextGov = e.target.value as EgyptGovernorate;
                      setPickupGovernorate(nextGov);
                      const nextAreas = GOVERNORATE_AREAS[nextGov] || ['أخرى'];
                      setPickupArea(nextAreas[0]);
                    }}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  >
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>
                        محافظة {gov}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    منطقة / مدينة الاستلام ({pickupGovernorate}){' '}
                    <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={pickupArea}
                    onChange={(e) => setPickupArea(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  >
                    {pickupAreasList.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                    {!pickupAreasList.includes(pickupArea) && (
                      <option value={pickupArea}>{pickupArea}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Sender Detailed Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  عنوان المُرسل التفصيلي (مكان الاستلام){' '}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  placeholder="اسم الشارع، رقم العقار أو المحل، الدور ورقم الشقة..."
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                />
              </div>

              {/* Sender Address Landmark */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>علامة مميزة لعنوان المُرسل</span>
                </label>
                <input
                  type="text"
                  value={senderLandmark}
                  onChange={(e) => setSenderLandmark(e.target.value)}
                  placeholder="مثال: أمام مسجد السيدة زينب / بجوار صيدلية العزبي / فوق كشري التحرير"
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-orange-50/30 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#F97316]"
                />
              </div>
            </section>

            {/* Section 2: Recipient Info */}
            <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-[#F97316]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    2. بيانات المُستلم (العميل - كافة المحافظات)
                  </h2>
                  <p className="text-xs text-slate-500">
                    المحافظة والمنطقة وعنوان التوصيل والعلامة المميزة وموقع خرائط جوجل
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم المستلم <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="الاسم الكامل للمستلم"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم هاتف المستلم <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="01123456789"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono-num text-right text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                </div>
              </div>

              {/* Governorate + Area of Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    محافظة التسليم <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={deliveryGovernorate}
                    onChange={(e) => {
                      const nextGov = e.target.value as EgyptGovernorate;
                      setDeliveryGovernorate(nextGov);
                      const nextAreas = GOVERNORATE_AREAS[nextGov] || ['أخرى'];
                      setDeliveryArea(nextAreas[0]);
                    }}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  >
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>
                        محافظة {gov}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    منطقة / مدينة التسليم ({deliveryGovernorate}){' '}
                    <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={deliveryArea}
                    onChange={(e) => setDeliveryArea(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  >
                    {deliveryAreasList.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                    {!deliveryAreasList.includes(deliveryArea) && (
                      <option value={deliveryArea}>{deliveryArea}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  عنوان المستلم التفصيلي <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={detailedAddress}
                  onChange={(e) => setDetailedAddress(e.target.value)}
                  placeholder="اسم الشارع، رقم العقار، الدور ورقم الشقة..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                />
              </div>

              {/* Recipient Address Landmark */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>علامة مميزة لعنوان المستلم</span>
                </label>
                <input
                  type="text"
                  value={recipientLandmark}
                  onChange={(e) => setRecipientLandmark(e.target.value)}
                  placeholder="مثال: أمام محطة المترو / بجوار صيدلية سيف / خلف المول الرئيسي"
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-orange-50/30 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>رابط موقع خرائط جوجل (Google Maps Link - اختياري)</span>
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={googleMapsLink}
                  onChange={(e) => setGoogleMapsLink(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                />
              </div>
            </section>
          </div>

          {/* Left Column (5 cols on desktop): Financial Details & Submit */}
          <div className="lg:col-span-5 space-y-6">
            <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4 text-[#F97316]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      3. التفاصيل المالية للشحنة
                    </h2>
                    <p className="text-xs text-slate-500">
                      حساب التحصيل (COD) وتكلفة التوصيل
                    </p>
                  </div>
                </div>

                {isAdminAuthenticated && (
                  <button
                    type="button"
                    onClick={onOpenAreaRatesModal}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] border border-orange-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Coins className="w-3.5 h-3.5 shrink-0" />
                    <span>إضافة / تعديل تكلفة الشحن لكل منطقة</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    قيمة الأوردر / الطرد (COD) ج.م
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={codAmountStr}
                    onChange={(e) => setCodAmountStr(e.target.value)}
                    placeholder="0 للطرود الشخصية المدفوعة"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base font-bold font-mono-num text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                  <span className="block text-[11px] text-slate-500 mt-1">
                    ضع 0 إذا كان طرداً شخصياً بدون تحصيل قيمة سلعة
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      تكلفة الشحن (ج.م)
                    </label>
                    {isFeeManuallyEdited && (
                      <button
                        type="button"
                        onClick={handleResetAutoFee}
                        className="text-[11px] text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>تلقائي</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={shippingFeeStr}
                    onChange={(e) => {
                      setShippingFeeStr(e.target.value);
                      setIsFeeManuallyEdited(true);
                    }}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base font-bold font-mono-num text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                  <span className="block text-[11px] text-slate-500 mt-1">
                    {isFeeManuallyEdited
                      ? 'تم التحديد يدوياً'
                      : `حسب المنطقة (${pickupGovernorate}/${pickupArea} ⬅ ${deliveryGovernorate}/${deliveryArea})`}
                  </span>
                </div>
              </div>

              {/* Who bears shipping cost */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  من يتحمل مصاريف الشحن؟
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShippingBearer('recipient')}
                    className={`min-h-[52px] px-3.5 py-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-center ${
                      shippingBearer === 'recipient'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold">تُضاف على المستلم</div>
                    <div
                      className={`text-[11px] ${
                        shippingBearer === 'recipient'
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      يدفع المستلم (قيمة الطرد + الشحن)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShippingBearer('merchant')}
                    className={`min-h-[52px] px-3.5 py-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-center ${
                      shippingBearer === 'merchant'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      تُخصم من حساب المُرسل
                    </div>
                    <div
                      className={`text-[11px] ${
                        shippingBearer === 'merchant'
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      المُرسل يتحمل الشحن (مجاني للمستلم)
                    </div>
                  </button>
                </div>
              </div>

              {/* Live Financial Calculation Preview */}
              <div className="rounded-xl bg-slate-900 text-white p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>إجمالي المطلوب تحصيله من المستلم:</span>
                  <span className="text-lg font-bold font-mono-num text-[#F97316]">
                    {liveFinancials.totalToCollectFromCustomer.toLocaleString(
                      'en-US'
                    )}{' '}
                    ج.م
                  </span>
                </div>
                <div className="h-px bg-slate-800" />
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>صافي المبلغ المستحق للمُرسل:</span>
                  <span className="text-sm font-bold font-mono-num text-emerald-400">
                    {liveFinancials.netPayableToMerchant.toLocaleString('en-US')}{' '}
                    ج.م
                  </span>
                </div>
                {isAdminAuthenticated && (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>إيراد الكابتن من المشوار:</span>
                    <span className="text-xs font-bold font-mono-num text-slate-200">
                      {liveFinancials.captainProfit.toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  ملاحظات إضافية للكابتن (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: قابل للكسر، تسليم قبل الساعة 6..."
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_NOTES.map((qn) => (
                    <button
                      key={qn}
                      type="button"
                      onClick={() => handleAppendQuickNote(qn)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      + {qn}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[52px] px-5 py-3.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.99] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer"
              >
                <PackagePlus className="w-5 h-5 shrink-0" />
                <span>تأكيد الطلب وإصدار بوليصة الشحن</span>
              </button>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
};
