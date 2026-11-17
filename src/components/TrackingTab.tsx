import React, { useEffect, useState } from 'react';
import {
  APP_LOGO_URL,
  computeShipmentFinancials,
  formatWaybillWhatsAppText,
  PROGRESS_STEPS,
  Shipment,
  STATUS_META,
} from '../types/shipment';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Store,
  User,
} from 'lucide-react';

interface TrackingTabProps {
  shipments: Shipment[];
  isAdminAuthenticated?: boolean;
  initialWaybillId?: string;
  showToast: (msg: string) => void;
}

export const TrackingTab: React.FC<TrackingTabProps> = ({
  shipments,
  isAdminAuthenticated = false,
  initialWaybillId,
  showToast,
}) => {
  const [query, setQuery] = useState(initialWaybillId || '');

  useEffect(() => {
    if (initialWaybillId) {
      setQuery(initialWaybillId);
    }
  }, [initialWaybillId]);

  // Match shipment by exact or partial waybill number (#SH-1001 or 1001) or phone
  const matchedShipment = React.useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return null;

    return (
      shipments.find((s) => s.id.toLowerCase() === clean) ||
      shipments.find((s) =>
        s.id.toLowerCase().includes(clean.replace(/^#?sh-?/i, ''))
      ) ||
      shipments.find(
        (s) =>
          s.recipientPhone.includes(clean) || s.senderPhone.includes(clean)
      ) ||
      null
    );
  }, [shipments, query]);

  const formatArabicDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ar-EG', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const handleCopyWaybill = async (shipment: Shipment) => {
    const text = formatWaybillWhatsAppText(shipment);
    try {
      await navigator.clipboard.writeText(text);
      showToast('تم نسخ ملخص التتبع والبوليصة بنجاح');
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Box Card */}
      <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-3.5">
          <img
            src={APP_LOGO_URL}
            alt="شعار وصلها لي - أسهل توصيل"
            className="w-12 h-12 rounded-full object-cover border-2 border-[#F97316] bg-white shadow-xs shrink-0"
          />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              التتبع السريع للشحنات والبوالص — وصلها لي (أسهل توصيل)
            </h2>
            <p className="text-xs text-slate-500">
              أدخل رقم البوليصة (مثال: #SH-1001) أو رقم الهاتف لعرض حالة الشحنة وخط السير الزمني
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="أدخل رقم البوليصة مثل #SH-1001 أو رقم الهاتف..."
            className="w-full min-h-[50px] pr-12 pl-4 py-3 rounded-xl border border-slate-300 bg-slate-50/70 text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
          />
        </div>

        {/* Quick Select Buttons for Existing Waybills (Visible to Admin/Captain Only) */}
        {isAdminAuthenticated && shipments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-500">
              بوالص مسجلة حالياً (لوحة الكابتن):
            </span>
            {shipments.slice(0, 8).map((s) => {
              const isSelected = matchedShipment?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setQuery(s.id)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="font-mono-num" dir="ltr">
                    {s.id}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{s.recipientName.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Result Display */}
      {!matchedShipment ? (
        <div className="rounded-2xl bg-white p-10 border border-slate-200 text-center space-y-2">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            لم يتم العثور على بوليصة بهذا الرقم
          </h3>
          <p className="text-xs text-slate-500">
            تأكد من كتابة رقم البوليصة بشكل صحيح (مثال: #SH-1001) أو اختر إحدى البوالص أعلاه.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Visual Timeline Card (7 cols on desktop) */}
          <section className="lg:col-span-7 rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs text-slate-500">
                  تاريخ التسجيل: {formatArabicDateTime(matchedShipment.createdAt)}
                </div>
                <div className="flex items-center gap-2.5 mt-1">
                  <h3
                    className="text-xl font-bold font-mono-num text-slate-900"
                    dir="ltr"
                  >
                    {matchedShipment.id}
                  </h3>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      STATUS_META[matchedShipment.status].textColor
                    }`}
                  >
                    {STATUS_META[matchedShipment.status].label}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyWaybill(matchedShipment)}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>نسخ بيانات التتبع</span>
              </button>
            </div>

            {/* Horizontal / Step-by-Step Progress Bar */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-600">
                شريط التقدم البصري لحالة الشحنة:
              </h4>

              {matchedShipment.status === 'returned' ? (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-sm font-bold flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>
                    هذه الشحنة في حالة (مرتجع / ملغي) — تم إيقاف خط التوصيل.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {PROGRESS_STEPS.map((step, index) => {
                    const currentIdx =
                      STATUS_META[matchedShipment.status].stepIndex;
                    const isCompleted = currentIdx >= index;
                    const isCurrent = currentIdx === index;
                    const logEntry = [...matchedShipment.statusHistory]
                      .reverse()
                      .find((h) => h.status === step);

                    return (
                      <div
                        key={step}
                        className={`rounded-xl p-3.5 border transition-all ${
                          isCurrent
                            ? step === 'delivered'
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-orange-50 border-orange-300'
                            : isCompleted
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-mono-num font-bold">
                            0{index + 1}
                          </span>
                          {isCompleted ? (
                            <CheckCircle2
                              className={`w-4 h-4 ${
                                isCurrent
                                  ? step === 'delivered'
                                    ? 'text-emerald-600'
                                    : 'text-[#F97316]'
                                  : 'text-emerald-400'
                              }`}
                            />
                          ) : (
                            <Clock className="w-4 h-4 opacity-50" />
                          )}
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            isCurrent ? 'text-slate-900' : ''
                          }`}
                        >
                          {STATUS_META[step].label}
                        </div>
                        {logEntry && (
                          <div
                            className={`text-[10px] mt-1 ${
                              isCurrent
                                ? 'text-slate-600'
                                : isCompleted
                                ? 'text-slate-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {new Date(logEntry.timestamp).toLocaleTimeString(
                              'ar-EG',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detailed Chronological Event Log */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-600">
                السجل الزمني لحركة الشحنة:
              </h4>
              <div className="space-y-3 pr-2 border-r-2 border-slate-200">
                {matchedShipment.statusHistory.map((item, idx) => (
                  <div
                    key={`${item.status}-${idx}`}
                    className="relative pr-4 space-y-0.5"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F97316] absolute -right-[13px] top-1.5 ring-4 ring-white" />
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {item.label || STATUS_META[item.status]?.label}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatArabicDateTime(item.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Shipment & Financial Details Card (5 cols on desktop) */}
          <section className="lg:col-span-5 rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
            <h4 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              تفاصيل الاستلام والتسليم والحساب
            </h4>

            <div className="space-y-4 text-sm">
              {/* Sender */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Store className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500">
                    المُرسل (
                    {matchedShipment.senderType === 'individual'
                      ? 'فرد / أهالي المنطقة'
                      : 'تاجر / محل'}
                    ) · استلام من{' '}
                    {matchedShipment.pickupGovernorate || 'القاهرة'} -{' '}
                    {matchedShipment.pickupArea}
                  </div>
                  <div className="font-bold text-slate-900">
                    {matchedShipment.senderName}
                  </div>
                  <div className="text-xs font-mono-num text-slate-600" dir="ltr">
                    {matchedShipment.senderPhone}
                  </div>
                  {matchedShipment.senderAddress && (
                    <div className="text-xs text-slate-700 mt-1 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 inline ml-1 text-[#F97316]" />
                      {matchedShipment.senderAddress}
                    </div>
                  )}
                  {matchedShipment.senderLandmark && (
                    <div className="text-xs font-semibold text-[#EA580C]">
                      علامة مميزة للمُرسل: {matchedShipment.senderLandmark}
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient */}
              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500">
                    المستلم · تسليم في{' '}
                    {matchedShipment.deliveryGovernorate || 'القاهرة'} -{' '}
                    {matchedShipment.deliveryArea}
                  </div>
                  <div className="font-bold text-slate-900">
                    {matchedShipment.recipientName}
                  </div>
                  <div className="text-xs font-mono-num text-slate-600" dir="ltr">
                    {matchedShipment.recipientPhone}
                  </div>
                  <div className="text-xs text-slate-700 mt-1 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 inline ml-1 text-[#F97316]" />
                    {matchedShipment.detailedAddress}
                  </div>
                  {matchedShipment.recipientLandmark && (
                    <div className="text-xs font-semibold text-emerald-700">
                      علامة مميزة للمستلم: {matchedShipment.recipientLandmark}
                    </div>
                  )}
                </div>
              </div>

              {/* Financials Summary */}
              {(() => {
                const fin = computeShipmentFinancials(matchedShipment);
                return (
                  <div className="rounded-xl bg-slate-900 text-white p-4 space-y-2.5 mt-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>قيمة الأوردر (COD):</span>
                      <span className="font-mono-num font-bold">
                        {fin.codAmount.toLocaleString('en-US')} ج.م
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>
                        تكلفة الشحن (
                        {matchedShipment.shippingBearer === 'recipient'
                          ? 'تُضاف على المستلم'
                          : 'تُخصم من المُرسل'}
                        ):
                      </span>
                      <span className="font-mono-num font-bold text-[#F97316]">
                        {fin.shippingFee.toLocaleString('en-US')} ج.م
                      </span>
                    </div>
                    <div className="h-px bg-slate-800" />
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>إجمالي المطلوب من المستلم:</span>
                      <span className="font-mono-num text-emerald-400 text-base">
                        {fin.totalToCollectFromCustomer.toLocaleString('en-US')}{' '}
                        ج.م
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Direct Contact Actions */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <a
                  href={`tel:${matchedShipment.recipientPhone}`}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#F97316]" />
                  <span>اتصال بالمستلم</span>
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    formatWaybillWhatsAppText(matchedShipment)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>مشاركة عبر واتساب</span>
                </a>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
