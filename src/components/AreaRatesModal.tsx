import React, { useMemo, useState } from 'react';
import {
  calculateAutoShippingFee,
  CustomAreaRatesMap,
  EGYPT_GOVERNORATES,
  EgyptGovernorate,
  getAreaRateKey,
  getAreasForGovernorate,
} from '../types/shipment';
import {
  Check,
  Coins,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface AreaRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customAreaRates: CustomAreaRatesMap;
  onSetAreaRate: (
    governorate: EgyptGovernorate,
    area: string,
    rate: number
  ) => void;
  onRemoveAreaRate: (governorate: EgyptGovernorate, area: string) => void;
  onSetBulkGovernorateRate: (
    governorate: EgyptGovernorate,
    rate: number
  ) => void;
  onResetDefaultRates: () => void;
  showToast: (msg: string) => void;
}

export const AreaRatesModal: React.FC<AreaRatesModalProps> = ({
  isOpen,
  onClose,
  customAreaRates,
  onSetAreaRate,
  onRemoveAreaRate,
  onSetBulkGovernorateRate,
  onResetDefaultRates,
  showToast,
}) => {
  const [selectedGovernorate, setSelectedGovernorate] =
    useState<EgyptGovernorate>('القاهرة');
  const [searchQuery, setSearchQuery] = useState('');

  // Form to add a new custom area or set rate for an area
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaPriceStr, setNewAreaPriceStr] = useState('60');
  const [bulkPriceStr, setBulkPriceStr] = useState('');

  const areasInGov = useMemo(() => {
    const list = getAreasForGovernorate(selectedGovernorate, customAreaRates);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((a) => a.toLowerCase().includes(q));
  }, [selectedGovernorate, customAreaRates, searchQuery]);

  if (!isOpen) return null;

  const handleAddOrUpdateArea = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanArea = newAreaName.trim();
    const rate = Math.max(0, Number(newAreaPriceStr) || 0);
    if (!cleanArea) return;

    onSetAreaRate(selectedGovernorate, cleanArea, rate);
    setNewAreaName('');
    showToast(
      `تم حفظ تكلفة الشحن لمنطقة (${cleanArea} - ${selectedGovernorate}) بقيمة ${rate} ج.م`
    );
  };

  const handleApplyBulkRate = () => {
    const rate = Math.max(0, Number(bulkPriceStr) || 0);
    if (!bulkPriceStr.trim() || rate <= 0) return;
    onSetBulkGovernorateRate(selectedGovernorate, rate);
    setBulkPriceStr('');
    showToast(
      `تم توحيد تكلفة الشحن لجميع مناطق محافظة (${selectedGovernorate}) بقيمة ${rate} ج.م`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-3xl max-h-[90vh] rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                جدول وإضافة تكلفة الشحن لكل منطقة ومحافظة
              </h2>
              <p className="text-xs text-slate-300">
                حدّد سعر الشحن لكل منطقة أو أضف منطقة جديدة ليتم حسابها تلقائياً عند تسجيل أي طلب
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Step 1: Select Governorate & Add New Area Rate Form */}
          <form
            onSubmit={handleAddOrUpdateArea}
            className="rounded-2xl bg-slate-50 p-4 border border-slate-200/90 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#F97316]" />
                <span>إضافة منطقة جديدة أو تحديد تكلفة شحن منطقة</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  onResetDefaultRates();
                  showToast('تمت استعادة أسعار الشحن الافتراضية للمناطق');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-[#F97316] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الأسعار الافتراضية</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المحافظة
                </label>
                <select
                  value={selectedGovernorate}
                  onChange={(e) =>
                    setSelectedGovernorate(e.target.value as EgyptGovernorate)
                  }
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      محافظة {gov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المنطقة / المدينة / الحي
                </label>
                <input
                  type="text"
                  required
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder={`مثال: منطقة جديدة في ${selectedGovernorate}...`}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تكلفة الشحن (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  required
                  dir="ltr"
                  value={newAreaPriceStr}
                  onChange={(e) => setNewAreaPriceStr(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold font-mono-num text-right text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>إضافة / حفظ السعر</span>
                </button>
              </div>
            </div>
          </form>

          {/* Filter & Bulk Governorate Price Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`ابحث عن منطقة داخل محافظة ${selectedGovernorate}...`}
                className="w-full min-h-[42px] pr-10 pl-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min="0"
                step="5"
                value={bulkPriceStr}
                onChange={(e) => setBulkPriceStr(e.target.value)}
                placeholder="سعر موحد للمحافظة..."
                dir="ltr"
                className="w-36 min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono-num text-right"
              />
              <button
                type="button"
                onClick={handleApplyBulkRate}
                className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                تعميم على {selectedGovernorate}
              </button>
            </div>
          </div>

          {/* Areas Grid for Selected Governorate */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-bold text-slate-800">
                مناطق ومدن محافظة {selectedGovernorate} ({areasInGov.length})
              </span>
              <span>عدّل السعر مباشرة ليُطبق تلقائياً في الطلبات الجديدة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {areasInGov.map((area) => {
                const key = getAreaRateKey(selectedGovernorate, area);
                const hasCustom = typeof customAreaRates[key] === 'number';
                const currentFee = hasCustom
                  ? customAreaRates[key]
                  : calculateAutoShippingFee(
                      area,
                      area === 'وسط البلد' ? 'مدينة نصر' : area,
                      selectedGovernorate,
                      selectedGovernorate,
                      customAreaRates
                    );

                return (
                  <div
                    key={key}
                    className={`rounded-xl p-3 border flex items-center justify-between gap-3 transition-colors ${
                      hasCustom
                        ? 'bg-orange-50/40 border-orange-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin
                        className={`w-4 h-4 shrink-0 ${
                          hasCustom ? 'text-[#F97316]' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {area}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {hasCustom ? (
                            <span className="text-[#EA580C] font-semibold">
                              سعر مخصص محفوظ
                            </span>
                          ) : (
                            <span>سعر تلقائي افتراضي</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="0"
                          step="5"
                          dir="ltr"
                          value={currentFee}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            onSetAreaRate(selectedGovernorate, area, val);
                          }}
                          className="w-full min-h-[38px] pl-8 pr-2.5 py-1 rounded-lg border border-slate-300 bg-white text-sm font-bold font-mono-num text-right text-slate-900 focus:outline-none focus:border-[#F97316]"
                        />
                        <span className="text-[10px] text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          ج.م
                        </span>
                      </div>

                      {hasCustom && (
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveAreaRate(selectedGovernorate, area)
                          }
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="إلغاء التخصيص والعودة للسعر التلقائي"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-600">
            يتم حفظ جميع الأسعار تلقائياً على جهازك وتعمل بدون إنترنت
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>تم الحفظ وإغلاق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
