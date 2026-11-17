import React, { useMemo, useState } from 'react';
import {
  computeShipmentFinancials,
  DailyExpense,
  EXPENSE_CATEGORY_META,
  ExpenseCategory,
  formatEgyptWhatsAppNumber,
  SenderType,
  ShiftArchiveRecord,
  Shipment,
  STATUS_META,
} from '../types/shipment';
import { exportShipmentsToCSV } from '../utils/exportImport';
import {
  Archive,
  Banknote,
  Calculator,
  Calendar,
  CalendarRange,
  Check,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Fuel,
  History,
  MessageCircle,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  Users,
  Wrench,
  X,
} from 'lucide-react';

interface AccountingTabProps {
  shipments: Shipment[];
  expenses: DailyExpense[];
  archivedShifts: ShiftArchiveRecord[];
  onAddExpense: (
    category: ExpenseCategory,
    amount: number,
    description: string,
    expenseDate?: string
  ) => void;
  onDeleteExpense: (expenseId: string) => void;
  onSettleMerchant: (
    senderName: string,
    senderPhone: string,
    settled: boolean
  ) => void;
  onCloseShiftAndArchive: (archiveAllIncludingActive: boolean) => void;
  showToast: (msg: string) => void;
}

interface SenderSettlementGroup {
  key: string;
  senderName: string;
  senderPhone: string;
  senderType: SenderType;
  pickupArea: string;
  orders: Shipment[];
  deliveredCount: number;
  inProgressCount: number;
  returnedCount: number;
  unsettledDeliveredCount: number;
  unsettledCodTotal: number;
  unsettledShippingDeducted: number;
  unsettledNetPayable: number;
  totalDeliveredNet: number;
  projectedNetIfAllDelivered: number;
  allDeliveredSettled: boolean;
}

type DateFilterMode =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'thisMonth'
  | 'singleDate'
  | 'dateRange';

/**
 * Helper to extract local YYYY-MM-DD from an ISO timestamp
 */
function toLocalYmd(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

function getTodayYmd(): string {
  return toLocalYmd(new Date().toISOString());
}

function getYesterdayYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalYmd(d.toISOString());
}

function getNDaysAgoYmd(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalYmd(d.toISOString());
}

function getStartOfMonthYmd(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function formatArabicYmdLabel(ymd: string): string {
  if (!ymd) return '';
  try {
    const d = new Date(`${ymd}T12:00:00`);
    return d.toLocaleDateString('ar-EG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return ymd;
  }
}

export const AccountingTab: React.FC<AccountingTabProps> = ({
  shipments,
  expenses,
  archivedShifts,
  onAddExpense,
  onDeleteExpense,
  onSettleMerchant,
  onCloseShiftAndArchive,
  showToast,
}) => {
  const [copiedMerchantKey, setCopiedMerchantKey] = useState<string | null>(
    null
  );
  const [copiedBudgetReport, setCopiedBudgetReport] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveIncludeActive, setArchiveIncludeActive] = useState(false);

  // Date Search & Filter State
  const todayYmd = useMemo(() => getTodayYmd(), []);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all');
  const [selectedSingleDate, setSelectedSingleDate] =
    useState<string>(todayYmd);
  const [rangeStartDate, setRangeStartDate] = useState<string>(
    getNDaysAgoYmd(7)
  );
  const [rangeEndDate, setRangeEndDate] = useState<string>(todayYmd);
  const [includeArchivedInSearch, setIncludeArchivedInSearch] =
    useState<boolean>(true);

  // Expense Form State (Fuel, Car Maintenance, Other + Expense Date)
  const [expenseCategory, setExpenseCategory] =
    useState<ExpenseCategory>('fuel');
  const [expenseAmountInput, setExpenseAmountInput] = useState<string>('');
  const [expenseDescInput, setExpenseDescInput] = useState<string>('');
  const [expenseDateInput, setExpenseDateInput] = useState<string>(todayYmd);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Combine active + archived shipments/expenses when includeArchivedInSearch is enabled and a date filter is active
  const combinedSourceData = useMemo(() => {
    if (!includeArchivedInSearch || dateFilterMode === 'all') {
      return {
        allShipments: shipments,
        allExpenses: expenses,
      };
    }

    const shipmentMap = new Map<string, Shipment>();
    shipments.forEach((s) => shipmentMap.set(s.id, s));
    archivedShifts.forEach((shift) => {
      shift.shipments?.forEach((s) => {
        if (!shipmentMap.has(s.id)) {
          shipmentMap.set(s.id, s);
        }
      });
    });

    const expenseMap = new Map<string, DailyExpense>();
    expenses.forEach((e) => expenseMap.set(e.id, e));
    archivedShifts.forEach((shift) => {
      shift.expenses?.forEach((e) => {
        if (!expenseMap.has(e.id)) {
          expenseMap.set(e.id, e);
        }
      });
    });

    return {
      allShipments: Array.from(shipmentMap.values()),
      allExpenses: Array.from(expenseMap.values()),
    };
  }, [
    shipments,
    expenses,
    archivedShifts,
    includeArchivedInSearch,
    dateFilterMode,
  ]);

  // Collect all unique dates (YYYY-MM-DD) that have recorded shipments or expenses for 1-tap quick search
  const recordedDatesList = useMemo(() => {
    const dateSet = new Set<string>();
    shipments.forEach((s) => {
      const ymd = toLocalYmd(s.createdAt);
      if (ymd) dateSet.add(ymd);
    });
    expenses.forEach((e) => {
      const ymd = toLocalYmd(e.createdAt);
      if (ymd) dateSet.add(ymd);
    });
    archivedShifts.forEach((shift) => {
      const ymd = toLocalYmd(shift.closedAt);
      if (ymd) dateSet.add(ymd);
      shift.shipments?.forEach((s) => {
        const sYmd = toLocalYmd(s.createdAt);
        if (sYmd) dateSet.add(sYmd);
      });
    });
    return Array.from(dateSet)
      .sort((a, b) => (a > b ? -1 : 1))
      .slice(0, 10);
  }, [shipments, expenses, archivedShifts]);

  // Date matching predicate
  const matchesDateFilter = useMemo(() => {
    const tYmd = getTodayYmd();
    const yYmd = getYesterdayYmd();
    const last7Ymd = getNDaysAgoYmd(6);
    const monthStartYmd = getStartOfMonthYmd();

    return (isoTimestamp: string): boolean => {
      if (dateFilterMode === 'all') return true;
      const itemYmd = toLocalYmd(isoTimestamp);
      if (!itemYmd) return false;

      switch (dateFilterMode) {
        case 'today':
          return itemYmd === tYmd;
        case 'yesterday':
          return itemYmd === yYmd;
        case 'last7days':
          return itemYmd >= last7Ymd && itemYmd <= tYmd;
        case 'thisMonth':
          return itemYmd >= monthStartYmd && itemYmd <= tYmd;
        case 'singleDate':
          return selectedSingleDate ? itemYmd === selectedSingleDate : true;
        case 'dateRange': {
          const start = rangeStartDate || '0000-01-01';
          const end = rangeEndDate || '9999-12-31';
          const actualStart = start <= end ? start : end;
          const actualEnd = start <= end ? end : start;
          return itemYmd >= actualStart && itemYmd <= actualEnd;
        }
        default:
          return true;
      }
    };
  }, [dateFilterMode, selectedSingleDate, rangeStartDate, rangeEndDate]);

  // Filtered Shipments, Expenses, and Archived Shifts according to the active Date Search
  const filteredShipments = useMemo(() => {
    return combinedSourceData.allShipments.filter((s) =>
      matchesDateFilter(s.createdAt)
    );
  }, [combinedSourceData.allShipments, matchesDateFilter]);

  const filteredExpenses = useMemo(() => {
    return combinedSourceData.allExpenses.filter((e) =>
      matchesDateFilter(e.createdAt)
    );
  }, [combinedSourceData.allExpenses, matchesDateFilter]);

  const filteredArchivedShifts = useMemo(() => {
    return archivedShifts.filter((shift) => matchesDateFilter(shift.closedAt));
  }, [archivedShifts, matchesDateFilter]);

  // Human-readable description of the active date filter
  const activePeriodLabel = useMemo(() => {
    switch (dateFilterMode) {
      case 'all':
        return 'كل التواريخ (جميع الحركات المسجلة)';
      case 'today':
        return `اليوم (${formatArabicYmdLabel(getTodayYmd())})`;
      case 'yesterday':
        return `أمس (${formatArabicYmdLabel(getYesterdayYmd())})`;
      case 'last7days':
        return `آخر 7 أيام (من ${formatArabicYmdLabel(
          getNDaysAgoYmd(6)
        )} إلى اليوم)`;
      case 'thisMonth':
        return `هذا الشهر (من ${formatArabicYmdLabel(
          getStartOfMonthYmd()
        )} إلى اليوم)`;
      case 'singleDate':
        return `يوم محدد: ${formatArabicYmdLabel(selectedSingleDate)}`;
      case 'dateRange':
        return `فترة من ${formatArabicYmdLabel(
          rangeStartDate
        )} إلى ${formatArabicYmdLabel(rangeEndDate)}`;
      default:
        return 'كل التواريخ';
    }
  }, [dateFilterMode, selectedSingleDate, rangeStartDate, rangeEndDate]);

  // Top-level financial & budget metrics (computed dynamically for the selected date/period)
  const stats = useMemo(() => {
    let deliveredCount = 0;
    let inProgressCount = 0;
    let returnedCount = 0;

    let actualCashCollected = 0;
    let grossShippingRevenue = 0;
    let merchantUnsettledPayable = 0;
    let merchantSettledTotal = 0;

    let projectedExtraCash = 0;
    let projectedExtraProfit = 0;

    filteredShipments.forEach((s) => {
      const fin = computeShipmentFinancials(s);
      if (s.status === 'delivered') {
        deliveredCount++;
        actualCashCollected += fin.totalToCollectFromCustomer;
        grossShippingRevenue += fin.captainProfit;
        if (s.merchantSettled) {
          merchantSettledTotal += fin.netPayableToMerchant;
        } else {
          merchantUnsettledPayable += fin.netPayableToMerchant;
        }
      } else if (s.status === 'returned') {
        returnedCount++;
      } else {
        inProgressCount++;
        projectedExtraCash += fin.totalToCollectFromCustomer;
        projectedExtraProfit += fin.captainProfit;
      }
    });

    let fuelExpenses = 0;
    let maintenanceExpenses = 0;
    let otherExpenses = 0;

    filteredExpenses.forEach((exp) => {
      const amt = Math.max(0, Number(exp.amount) || 0);
      if (exp.category === 'fuel') fuelExpenses += amt;
      else if (exp.category === 'maintenance') maintenanceExpenses += amt;
      else otherExpenses += amt;
    });

    const totalExpenses = fuelExpenses + maintenanceExpenses + otherExpenses;
    const netProfitAfterExpenses = grossShippingRevenue - totalExpenses;
    const netCashInHandAfterExpenses = actualCashCollected - totalExpenses;

    return {
      totalCount: filteredShipments.length,
      deliveredCount,
      inProgressCount,
      returnedCount,
      actualCashCollected,
      grossShippingRevenue,
      fuelExpenses,
      maintenanceExpenses,
      otherExpenses,
      totalExpenses,
      netProfitAfterExpenses,
      netCashInHandAfterExpenses,
      merchantUnsettledPayable,
      merchantSettledTotal,
      projectedExtraCash,
      projectedExtraProfit,
    };
  }, [filteredShipments, filteredExpenses]);

  // Per-sender settlement aggregation (both individuals and merchants) for the selected date/period
  const merchantGroups = useMemo<SenderSettlementGroup[]>(() => {
    const map = new Map<string, Shipment[]>();

    filteredShipments.forEach((s) => {
      const key = `${s.senderName.trim()}||${s.senderPhone.trim()}`;
      const list = map.get(key) || [];
      list.push(s);
      map.set(key, list);
    });

    const groups: SenderSettlementGroup[] = [];

    map.forEach((orders, key) => {
      const first = orders[0];
      let deliveredCount = 0;
      let inProgressCount = 0;
      let returnedCount = 0;

      let unsettledDeliveredCount = 0;
      let unsettledCodTotal = 0;
      let unsettledShippingDeducted = 0;
      let unsettledNetPayable = 0;
      let totalDeliveredNet = 0;
      let projectedNetIfAllDelivered = 0;

      orders.forEach((o) => {
        const fin = computeShipmentFinancials(o);
        if (o.status === 'delivered') {
          deliveredCount++;
          totalDeliveredNet += fin.netPayableToMerchant;
          projectedNetIfAllDelivered += fin.netPayableToMerchant;

          if (!o.merchantSettled) {
            unsettledDeliveredCount++;
            unsettledCodTotal += fin.codAmount;
            if (o.shippingBearer === 'merchant') {
              unsettledShippingDeducted += fin.shippingFee;
            }
            unsettledNetPayable += fin.netPayableToMerchant;
          }
        } else if (o.status === 'returned') {
          returnedCount++;
        } else {
          inProgressCount++;
          projectedNetIfAllDelivered += fin.netPayableToMerchant;
        }
      });

      const allDeliveredSettled =
        deliveredCount > 0 && unsettledDeliveredCount === 0;

      groups.push({
        key,
        senderName: first.senderName,
        senderPhone: first.senderPhone,
        senderType: first.senderType || 'merchant',
        pickupArea: first.pickupArea,
        orders,
        deliveredCount,
        inProgressCount,
        returnedCount,
        unsettledDeliveredCount,
        unsettledCodTotal,
        unsettledShippingDeducted,
        unsettledNetPayable,
        totalDeliveredNet,
        projectedNetIfAllDelivered,
        allDeliveredSettled,
      });
    });

    return groups;
  }, [filteredShipments]);

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);

    const parsedAmount = Number(expenseAmountInput);
    if (!expenseAmountInput.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setExpenseError('يرجى إدخال قيمة المصروف بالجنيه المصري بشكل صحيح.');
      return;
    }

    const defaultLabel = EXPENSE_CATEGORY_META[expenseCategory].label;
    const desc = expenseDescInput.trim() || defaultLabel;

    onAddExpense(
      expenseCategory,
      parsedAmount,
      desc,
      expenseDateInput || todayYmd
    );
    setExpenseAmountInput('');
    setExpenseDescInput('');
  };

  // Format End-of-Day / Filtered Date Budget & Net Profit Report
  const formatEndOfDayBudgetText = () => {
    const expenseLines =
      filteredExpenses.length > 0
        ? filteredExpenses.map(
            (e, idx) =>
              `${idx + 1}. [${EXPENSE_CATEGORY_META[e.category].shortLabel} - ${toLocalYmd(
                e.createdAt
              )}] ${e.description}: *${e.amount.toLocaleString('en-US')} ج.م*`
          )
        : ['• لا توجد مصاريف مسجلة في هذه الفترة'];

    const lines = [
      `📊 *تقرير ضبط الميزانية وحساب الربح الصافي - وصلها لي (أسهل توصيل)*`,
      `الفترة / التاريخ: *${activePeriodLabel}*`,
      `──────────────────`,
      `📦 *ملخص الشحنات (${stats.totalCount}):*`,
      `مسلمة: ${stats.deliveredCount} | قيد التوصيل: ${stats.inProgressCount} | مرتجع: ${stats.returnedCount}`,
      `──────────────────`,
      `💵 *إيرادات الشحن والتحصيل:*`,
      `إجمالي الكاش المُحصّل فعلياً: ${stats.actualCashCollected.toLocaleString('en-US')} ج.م`,
      `إجمالي إيراد الشحن (قبل المصاريف): *${stats.grossShippingRevenue.toLocaleString('en-US')} ج.م*`,
      `──────────────────`,
      `⛽ *تفاصيل المصاريف المكتوبة (${filteredExpenses.length}):*`,
      ...expenseLines,
      `• إجمالي بند البنزين والوقود: -${stats.fuelExpenses.toLocaleString('en-US')} ج.م`,
      `• إجمالي بند صيانة السيارة: -${stats.maintenanceExpenses.toLocaleString('en-US')} ج.م`,
      stats.otherExpenses > 0
        ? `• مصاريف تشغيل أخرى: -${stats.otherExpenses.toLocaleString('en-US')} ج.م`
        : '',
      `*إجمالي المصاريف المخصومة: -${stats.totalExpenses.toLocaleString('en-US')} ج.م*`,
      `──────────────────`,
      `✅ *صافي ربح الكابتن (بعد البنزين والصيانة): ${stats.netProfitAfterExpenses.toLocaleString('en-US')} ج.م*`,
      `💰 *صافي الكاش المتبقي بيد الكابتن بعد المصاريف: ${stats.netCashInHandAfterExpenses.toLocaleString('en-US')} ج.م*`,
      `🤝 *مستحقات المرسلين (أفراد وتجار) المطلوب توريدها: ${stats.merchantUnsettledPayable.toLocaleString('en-US')} ج.م*`,
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleCopyBudgetReport = async () => {
    const text = formatEndOfDayBudgetText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBudgetReport(true);
      showToast('تم نسخ تقرير الميزانية والمصاريف وصافي الربح');
      setTimeout(() => setCopiedBudgetReport(false), 2500);
    } catch {
      // ignore
    }
  };

  // Format itemized WhatsApp statement for a specific sender (individual or merchant)
  const formatMerchantStatementText = (group: SenderSettlementGroup) => {
    const senderTypeLabel =
      group.senderType === 'individual'
        ? 'عميل فرد / أهالي'
        : 'تاجر / نشاط تجاري';

    const orderLines = group.orders.map((o) => {
      const fin = computeShipmentFinancials(o);
      const statusLabel = STATUS_META[o.status].label;
      const bearerNote =
        o.shippingBearer === 'recipient'
          ? 'الشحن على المستلم'
          : `خصم شحن ${fin.shippingFee} ج.م`;
      return `• ${o.id} (${toLocalYmd(o.createdAt)}) | ${o.recipientName} (${o.deliveryArea}) ⬅ ${statusLabel} | الأوردر: ${fin.codAmount} ج.م (${bearerNote}) | الصافي: *${fin.netPayableToMerchant} ج.م*`;
    });

    const lines = [
      `📊 *كشف حساب وتصفية شحنات المُرسل - وصلها لي*`,
      `المُرسل: *${group.senderName}* (${senderTypeLabel})`,
      `الفترة / التاريخ: ${activePeriodLabel}`,
      `──────────────────`,
      `📦 *إجمالي الشحنات (${group.orders.length}):*`,
      `تم التسليم: ${group.deliveredCount} | قيد التوصيل: ${group.inProgressCount} | مرتجع: ${group.returnedCount}`,
      `──────────────────`,
      `📋 *تفاصيل البوالص:*`,
      ...orderLines,
      `──────────────────`,
      `💰 *ملخص التصفية المالية (للشحنات المسلمة):*`,
      `إجمالي تحصيل الأوردرات المسلمة: ${group.unsettledCodTotal.toLocaleString('en-US')} ج.م`,
      group.unsettledShippingDeducted > 0
        ? `مصاريف شحن مخصومة من حساب المُرسل: -${group.unsettledShippingDeducted.toLocaleString('en-US')} ج.م`
        : `مصاريف الشحن: مُحصّلة من المستلمين`,
      `*صافي المبلغ المستحق للتوريد حالياً: ${group.unsettledNetPayable.toLocaleString('en-US')} ج.م*`,
      group.inProgressCount > 0
        ? `(ملاحظة: يوجد عدد ${group.inProgressCount} شحنة قيد التوصيل بإجمالي متوقع ${group.projectedNetIfAllDelivered.toLocaleString('en-US')} ج.م بعد اكتمال تسليمها)`
        : '',
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleCopyAndSendStatement = async (
    group: SenderSettlementGroup,
    openWa: boolean
  ) => {
    const text = formatMerchantStatementText(group);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMerchantKey(group.key);
      showToast(`تم نسخ كشف حساب (${group.senderName})`);
      setTimeout(() => setCopiedMerchantKey(null), 2500);
    } catch {
      // ignore
    }

    if (openWa) {
      const waPhone = formatEgyptWhatsAppNumber(group.senderPhone);
      window.open(
        `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* NEW: Date Search & Period Filter Panel for Accounting & Budget */}
      <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <CalendarRange className="w-5 h-5 text-[#F97316]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                البحث في الحسابات والميزانية بالتاريخ
              </h2>
              <p className="text-xs text-slate-500">
                ابحث بيوم محدد أو فترة زمنية (من تاريخ إلى تاريخ) لمراجعة الشحنات والمصاريف وصافي الربح وحسابات المرسلين
              </p>
            </div>
          </div>

          {/* Toggle Including Archived Shifts in Date Search */}
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl cursor-pointer self-start lg:self-auto">
            <input
              type="checkbox"
              checked={includeArchivedInSearch}
              onChange={(e) => setIncludeArchivedInSearch(e.target.checked)}
              className="w-4 h-4 rounded accent-[#F97316]"
            />
            <span>شمل الورديات المؤرشفة السابقة عند البحث بالتاريخ</span>
          </label>
        </div>

        {/* Preset Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDateFilterMode('all')}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              dateFilterMode === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            كل التواريخ
          </button>

          <button
            type="button"
            onClick={() => {
              setDateFilterMode('today');
              setExpenseDateInput(getTodayYmd());
            }}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              dateFilterMode === 'today'
                ? 'bg-[#F97316] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            اليوم ({ getTodayYmd() })
          </button>

          <button
            type="button"
            onClick={() => {
              setDateFilterMode('yesterday');
              setExpenseDateInput(getYesterdayYmd());
            }}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              dateFilterMode === 'yesterday'
                ? 'bg-[#F97316] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            أمس
          </button>

          <button
            type="button"
            onClick={() => setDateFilterMode('last7days')}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              dateFilterMode === 'last7days'
                ? 'bg-[#F97316] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            آخر 7 أيام
          </button>

          <button
            type="button"
            onClick={() => setDateFilterMode('thisMonth')}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              dateFilterMode === 'thisMonth'
                ? 'bg-[#F97316] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            هذا الشهر
          </button>

          <button
            type="button"
            onClick={() => setDateFilterMode('singleDate')}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              dateFilterMode === 'singleDate'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-orange-50 text-[#EA580C] border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>بحث بيوم محدد</span>
          </button>

          <button
            type="button"
            onClick={() => setDateFilterMode('dateRange')}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              dateFilterMode === 'dateRange'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-orange-50 text-[#EA580C] border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 shrink-0" />
            <span>فترة (من تاريخ إلى تاريخ)</span>
          </button>
        </div>

        {/* Date Picker Inputs for Single Date OR Date Range */}
        {(dateFilterMode === 'singleDate' || dateFilterMode === 'dateRange') && (
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/90">
            {dateFilterMode === 'singleDate' ? (
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اختر التاريخ المطلوب عرض حساباته وميزانيته:
                  </label>
                  <input
                    type="date"
                    value={selectedSingleDate}
                    onChange={(e) => {
                      setSelectedSingleDate(e.target.value);
                      if (e.target.value) {
                        setExpenseDateInput(e.target.value);
                      }
                    }}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold font-mono-num text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div className="text-xs text-slate-600 pb-2">
                  التاريخ المختار:{' '}
                  <strong className="text-slate-900">
                    {formatArabicYmdLabel(selectedSingleDate)}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    من تاريخ (البداية):
                  </label>
                  <input
                    type="date"
                    value={rangeStartDate}
                    onChange={(e) => setRangeStartDate(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold font-mono-num text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    إلى تاريخ (النهاية):
                  </label>
                  <input
                    type="date"
                    value={rangeEndDate}
                    onChange={(e) => setRangeEndDate(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold font-mono-num text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div className="text-xs text-slate-600 pb-2">
                  يعرض جميع الشحنات والمصاريف وصافي الربح بين التاريخين.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Recorded Dates Bar (1-Tap Date Selection) */}
        {recordedDatesList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-[#F97316]" />
              <span>تواريخ مسجل بها حسابات:</span>
            </span>
            {recordedDatesList.map((ymd) => {
              const isSelected =
                dateFilterMode === 'singleDate' && selectedSingleDate === ymd;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => {
                    setSelectedSingleDate(ymd);
                    setDateFilterMode('singleDate');
                    setExpenseDateInput(ymd);
                  }}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold font-mono-num transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#F97316] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  dir="ltr"
                >
                  {ymd}
                </button>
              );
            })}
          </div>
        )}

        {/* Active Date Filter Summary Strip */}
        <div className="rounded-xl bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">نطاق العرض الحالي:</span>
            <strong className="text-[#F97316] text-xs sm:text-sm">
              {activePeriodLabel}
            </strong>
            <span className="text-slate-600" aria-hidden="true">
              |
            </span>
            <span>
              الشحنات المطابقة:{' '}
              <strong className="font-mono-num text-white">
                {filteredShipments.length}
              </strong>
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span>
              المصاريف المطابقة:{' '}
              <strong className="font-mono-num text-rose-400">
                {filteredExpenses.length}
              </strong>
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span>
              صافي ربح الفترة:{' '}
              <strong className="font-mono-num text-emerald-400">
                {stats.netProfitAfterExpenses.toLocaleString('en-US')} ج.م
              </strong>
            </span>
          </div>

          {dateFilterMode !== 'all' && (
            <button
              type="button"
              onClick={() => setDateFilterMode('all')}
              className="min-h-[32px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5 text-[#F97316]" />
              <span>إلغاء فلتر التاريخ وعرض الكل</span>
            </button>
          )}
        </div>
      </section>

      {/* 4 Top Statistical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Shipments Breakdown */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>إجمالي عدد الشحنات</span>
            <Package className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-3xl font-bold font-mono-num text-slate-900">
            {stats.totalCount}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
            <span className="text-emerald-700 font-bold">
              مسلمة: {stats.deliveredCount}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#EA580C] font-bold">
              جارية: {stats.inProgressCount}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-700 font-bold">
              مرتجع: {stats.returnedCount}
            </span>
          </div>
        </div>

        {/* Card 2: Total Cash Actually Collected in Captain's Hand */}
        <div className="rounded-2xl bg-slate-900 text-white p-5 border border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>الكاش المُحصّل فعلياً بيد الكابتن</span>
            <Banknote className="w-4 h-4 text-[#F97316]" />
          </div>
          <div className="text-3xl font-bold font-mono-num text-white">
            {stats.actualCashCollected.toLocaleString('en-US')}{' '}
            <span className="text-xs font-normal text-slate-300">ج.م</span>
          </div>
          <div className="text-xs text-slate-400 pt-1">
            بعد خصم المصاريف ({stats.totalExpenses} ج.م):{' '}
            <strong className="font-mono-num text-emerald-400">
              {stats.netCashInHandAfterExpenses.toLocaleString('en-US')} ج.م
            </strong>
          </div>
        </div>

        {/* Card 3: Captain's Final Net Profit (After Fuel & Car Maintenance) */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>صافي الربح بعد المصاريف</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div
            className={`text-3xl font-bold font-mono-num ${
              stats.netProfitAfterExpenses >= 0
                ? 'text-emerald-600'
                : 'text-rose-600'
            }`}
          >
            {stats.netProfitAfterExpenses.toLocaleString('en-US')}{' '}
            <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-xs text-slate-500 pt-1">
            الشحن ({stats.grossShippingRevenue} ج.م) - المصاريف (
            <strong className="font-mono-num text-rose-600">
              {stats.totalExpenses} ج.م
            </strong>
            )
          </div>
        </div>

        {/* Card 4: Total Payable to Senders (Individuals & Merchants) */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>مستحقات المرسلين (أفراد وتجار)</span>
            <Users className="w-4 h-4 text-[#F97316]" />
          </div>
          <div className="text-3xl font-bold font-mono-num text-[#F97316]">
            {stats.merchantUnsettledPayable.toLocaleString('en-US')}{' '}
            <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-xs text-slate-500 pt-1">
            تم توريده:{' '}
            <strong className="font-mono-num text-emerald-700">
              {stats.merchantSettledTotal.toLocaleString('en-US')} ج.م
            </strong>
          </div>
        </div>
      </div>

      {/* End-of-Day Budget Adjustment, Fuel & Car Maintenance Expenses, and Profit Calculator */}
      <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                ضبط الميزانية في آخر اليوم وحساب المصاريف والربح الصافي
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                سجّل بند البنزين وبند صيانة السيارة بالتاريخ واكتب تفاصيل المصاريف لحساب صافي ربحك الفعلي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyBudgetReport}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedBudgetReport ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تم نسخ تقرير الميزانية</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#F97316] shrink-0" />
                <span>نسخ ملخص الميزانية والمصاريف</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Add Expense Form + Written Expenses List */}
          <div className="lg:col-span-7 space-y-5">
            <form
              onSubmit={handleSubmitExpense}
              className="rounded-2xl bg-slate-50 p-4 sm:p-5 border border-slate-200/90 space-y-4"
            >
              <div className="text-xs sm:text-sm font-bold text-slate-900">
                إضافة مصروف جديد (بنزين / صيانة سيارة / مصاريف أخرى)
              </div>

              {expenseError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
                  {expenseError}
                </div>
              )}

              {/* Category Selection Buttons: Fuel, Car Maintenance, Other */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExpenseCategory('fuel')}
                  className={`min-h-[46px] px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    expenseCategory === 'fuel'
                      ? 'bg-[#F97316]/10 border-[#F97316] text-slate-900 shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Fuel
                    className={`w-4 h-4 shrink-0 ${
                      expenseCategory === 'fuel'
                        ? 'text-[#F97316]'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>بند البنزين والوقود</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseCategory('maintenance')}
                  className={`min-h-[46px] px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    expenseCategory === 'maintenance'
                      ? 'bg-[#F97316]/10 border-[#F97316] text-slate-900 shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Wrench
                    className={`w-4 h-4 shrink-0 ${
                      expenseCategory === 'maintenance'
                        ? 'text-[#F97316]'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>بند صيانة سيارة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseCategory('other')}
                  className={`min-h-[46px] px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    expenseCategory === 'other'
                      ? 'bg-[#F97316]/10 border-[#F97316] text-slate-900 shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Receipt
                    className={`w-4 h-4 shrink-0 ${
                      expenseCategory === 'other'
                        ? 'text-[#F97316]'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>مصاريف تشغيل أخرى</span>
                </button>
              </div>

              {/* Amount, Date & Written Expense Description */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    المبلغ (ج.م) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={expenseAmountInput}
                    onChange={(e) => setExpenseAmountInput(e.target.value)}
                    placeholder="مثال: 150"
                    dir="ltr"
                    className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تاريخ المصروف
                  </label>
                  <input
                    type="date"
                    value={expenseDateInput}
                    onChange={(e) => setExpenseDateInput(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold font-mono-num focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اكتب بيان وتفاصيل المصروف
                  </label>
                  <input
                    type="text"
                    value={expenseDescInput}
                    onChange={(e) => setExpenseDescInput(e.target.value)}
                    placeholder={
                      expenseCategory === 'fuel'
                        ? 'مثال: تفويلة بنزين 92'
                        : expenseCategory === 'maintenance'
                        ? 'مثال: غيار زيت / تيل فرامل'
                        : 'مثال: كارتة طريق / ركنة'
                    }
                    className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>
                  إضافة المصروف في السجل (
                  {EXPENSE_CATEGORY_META[expenseCategory].shortLabel})
                </span>
              </button>
            </form>

            {/* Written Daily Expenses Log ("واكتب المصاريف") */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  سجل المصاريف المكتوبة ({filteredExpenses.length})
                </h3>
                <span className="text-xs font-bold font-mono-num text-rose-600">
                  الإجمالي: -{stats.totalExpenses.toLocaleString('en-US')} ج.م
                </span>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-5 border border-slate-200/80 text-center text-xs text-slate-500">
                  لا توجد مصاريف مسجلة في التاريخ المحدد ({activePeriodLabel}).
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExpenses.map((exp) => {
                    const catMeta = EXPENSE_CATEGORY_META[exp.category];
                    const expYmd = toLocalYmd(exp.createdAt);
                    return (
                      <div
                        key={exp.id}
                        className="rounded-xl bg-white p-3.5 border border-slate-200/90 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              exp.category === 'fuel'
                                ? 'bg-amber-50 text-[#EA580C]'
                                : exp.category === 'maintenance'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {exp.category === 'fuel' ? (
                              <Fuel className="w-4 h-4" />
                            ) : exp.category === 'maintenance' ? (
                              <Wrench className="w-4 h-4" />
                            ) : (
                              <Receipt className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                              <span className={`font-bold ${catMeta.color}`}>
                                {catMeta.label}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-num font-semibold text-slate-600" dir="ltr">
                                {expYmd}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {new Date(exp.createdAt).toLocaleTimeString(
                                  'ar-EG',
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 break-words">
                              {exp.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-sm font-bold font-mono-num text-rose-600">
                            -{exp.amount.toLocaleString('en-US')} ج.م
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(exp.id)}
                            className="min-h-[38px] min-w-[38px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="حذف المصروف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): End-of-Day Budget & Net Profit Summary Card */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900 text-white p-5 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  ملخص ضبط الميزانية والربح الصافي
                </h3>
                <p className="text-xs text-[#F97316] font-semibold mt-0.5">
                  {activePeriodLabel}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-[#F97316] shrink-0" />
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              {/* Gross Shipping Revenue */}
              <div className="flex items-center justify-between text-slate-200">
                <span>إجمالي إيراد الشحن (من المسلم):</span>
                <span className="font-mono-num font-bold text-emerald-400 text-base">
                  +{stats.grossShippingRevenue.toLocaleString('en-US')} ج.م
                </span>
              </div>

              <div className="h-px bg-slate-800" />

              {/* Itemized Expense Categories */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>بند البنزين والوقود:</span>
                  </span>
                  <span className="font-mono-num font-bold text-rose-400">
                    -{stats.fuelExpenses.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-rose-400" />
                    <span>بند صيانة السيارة:</span>
                  </span>
                  <span className="font-mono-num font-bold text-rose-400">
                    -{stats.maintenanceExpenses.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span>مصاريف تشغيل أخرى:</span>
                  </span>
                  <span className="font-mono-num font-bold text-rose-400">
                    -{stats.otherExpenses.toLocaleString('en-US')} ج.م
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-rose-300 pt-1 border-t border-slate-800">
                <span>إجمالي المصاريف المخصومة:</span>
                <span className="font-mono-num text-sm">
                  -{stats.totalExpenses.toLocaleString('en-US')} ج.م
                </span>
              </div>

              {/* Final Net Profit Box */}
              <div className="rounded-xl bg-slate-800/90 p-4 border border-slate-700 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    صافي الربح النهائي:
                  </span>
                  <span
                    className={`text-xl font-bold font-mono-num ${
                      stats.netProfitAfterExpenses >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {stats.netProfitAfterExpenses.toLocaleString('en-US')} ج.م
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  يُحسب تلقائياً للفترة المحددة: إجمالي إيرادات الشحن (
                  {stats.grossShippingRevenue} ج.م) ناقص مصاريف البنزين وصيانة
                  السيارة ({stats.totalExpenses} ج.م).
                </p>
              </div>

              {/* Cash Reconciliation Box */}
              <div className="rounded-xl bg-slate-800/50 p-3.5 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>إجمالي الكاش المُحصّل من العملاء:</span>
                  <strong className="font-mono-num text-white">
                    {stats.actualCashCollected.toLocaleString('en-US')} ج.م
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>صافي الكاش المتبقي بعد المصاريف:</span>
                  <strong className="font-mono-num text-[#F97316]">
                    {stats.netCashInHandAfterExpenses.toLocaleString('en-US')}{' '}
                    ج.م
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>المطلوب توريده للمرسلين (أفراد وتجار):</span>
                  <strong className="font-mono-num text-emerald-400">
                    {stats.merchantUnsettledPayable.toLocaleString('en-US')} ج.م
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Per-Sender Settlement Section (Both Individuals & Merchants) */}
      <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              جدول تصفية حساب كل مُرسل على حدة (أفراد المنطقة والتجار)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              يجمع الطلبات الخاصة بكل مُرسل في الفترة المختارة ({activePeriodLabel}) ويحسب الصافي الواجب تحويله
            </p>
          </div>
        </div>

        {merchantGroups.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            لا توجد حسابات مرسلين مسجلة في هذا التاريخ ({activePeriodLabel}).
          </div>
        ) : (
          <div className="space-y-4">
            {merchantGroups.map((group) => (
              <div
                key={group.key}
                className="rounded-2xl bg-slate-50/80 p-4 sm:p-5 border border-slate-200/90 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Sender Identity & Order Counts */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span
                        className="font-mono-num font-bold text-slate-700"
                        dir="ltr"
                      >
                        {group.senderPhone}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-slate-700">
                        {group.senderType === 'individual'
                          ? 'فرد / أهالي المنطقة'
                          : 'تاجر / نشاط تجاري'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>منطقة الاستلام: {group.pickupArea}</span>
                      <span aria-hidden="true">·</span>
                      <span>إجمالي الشحنات: {group.orders.length}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {group.senderName}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-0.5">
                      <span className="text-emerald-700 font-semibold">
                        مسلمة: {group.deliveredCount}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#EA580C] font-semibold">
                        قيد التوصيل: {group.inProgressCount}
                      </span>
                      {group.returnedCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-rose-700 font-semibold">
                            مرتجع: {group.returnedCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Financial Math Summary for this Sender */}
                  <div className="grid grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 text-center shrink-0">
                    <div>
                      <div className="text-[11px] text-slate-500">
                        تحصيل المسلم
                      </div>
                      <div className="text-sm sm:text-base font-bold font-mono-num text-slate-900 mt-0.5">
                        {group.unsettledCodTotal.toLocaleString('en-US')} ج.م
                      </div>
                    </div>

                    <div className="border-x border-slate-100 px-3">
                      <div className="text-[11px] text-slate-500">
                        خصم شحن المُرسل
                      </div>
                      <div className="text-sm sm:text-base font-bold font-mono-num text-rose-600 mt-0.5">
                        -{group.unsettledShippingDeducted.toLocaleString('en-US')}{' '}
                        ج.م
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-slate-700">
                        الصافي الواجب تحويله
                      </div>
                      <div
                        className={`text-base sm:text-lg font-bold font-mono-num mt-0.5 ${
                          group.allDeliveredSettled
                            ? 'text-emerald-600'
                            : 'text-[#F97316]'
                        }`}
                      >
                        {group.unsettledNetPayable.toLocaleString('en-US')} ج.م
                      </div>
                    </div>
                  </div>
                </div>

                {/* Projected note if sender still has in-progress orders */}
                {group.inProgressCount > 0 && (
                  <div className="text-xs text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      يوجد عدد ({group.inProgressCount}) شحنة قيد التوصيل لهذا المُرسل لم تُسلم بعد.
                    </span>
                    <span>
                      إجمالي الصافي المتوقع بعد تسليم كافة شحناته:{' '}
                      <strong className="font-mono-num text-slate-900">
                        {group.projectedNetIfAllDelivered.toLocaleString(
                          'en-US'
                        )}{' '}
                        ج.م
                      </strong>
                    </span>
                  </div>
                )}

                {/* Action Buttons: Copy/WhatsApp Statement & Settle Balance */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => handleCopyAndSendStatement(group, true)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>نسخ كشف الحساب وإرساله واتساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyAndSendStatement(group, false)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedMerchantKey === group.key ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>تم نسخ الكشف</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0" />
                        <span>نسخ الكشف فقط</span>
                      </>
                    )}
                  </button>

                  {group.allDeliveredSettled ? (
                    <div className="flex items-center gap-2">
                      <span className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>تم التوريد وتصفير الرصيد</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onSettleMerchant(
                            group.senderName,
                            group.senderPhone,
                            false
                          )
                        }
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        title="إلغاء التوريد"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>تراجع</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={group.deliveredCount === 0}
                      onClick={() =>
                        onSettleMerchant(
                          group.senderName,
                          group.senderPhone,
                          true
                        )
                      }
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        group.deliveredCount === 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#F97316] shrink-0" />
                      <span>
                        تم التوريد (تصفير رصيد المسلم:{' '}
                        {group.unsettledNetPayable.toLocaleString('en-US')} ج.م)
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* End-of-Day Export & Shift Archiving Actions */}
      <section className="rounded-2xl bg-slate-900 text-white p-5 sm:p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              إجراءات تصدير التقرير وأرشفة الوردية
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              تصدير كشف الشحنات للفترة المحددة ({activePeriodLabel}) كملف Excel / CSV أو إغلاق الوردية لحفظها في الأرشيف
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => {
                exportShipmentsToCSV(
                  filteredShipments,
                  `تقرير-شحنات-${dateFilterMode === 'singleDate' ? selectedSingleDate : 'الفترة'}`
                );
                showToast('تم تصدير تقرير الشحنات بصيغة Excel / CSV');
              }}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5 shrink-0" />
              <span>
                تصدير تقرير الفترة ({filteredShipments.length}) Excel / CSV
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowArchiveConfirm(true)}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Archive className="w-5 h-5 shrink-0" />
              <span>إغلاق الوردية وأرشفة الطلبات</span>
            </button>
          </div>
        </div>

        {/* Inline Confirmation Dialog for Closing Shift */}
        {showArchiveConfirm && (
          <div className="rounded-xl bg-slate-800 p-4 border border-slate-700 space-y-3 mt-3">
            <div className="text-sm font-bold text-white">
              تأكيد إغلاق الوردية وأرشفة الطلبات
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              سيتم حفظ ملخص مالي كامل للوردية الحالية (بما يشمل مصاريف البنزين وصيانة السيارة وصافي الربح) في سجل الأرشيف أدناه. كيف ترغب في التعامل مع الشحنات؟
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={archiveIncludeActive}
                  onChange={(e) => setArchiveIncludeActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#F97316]"
                />
                <span>
                  أرشفة جميع الشحنات وتفريغ اللوحة بالكامل (في حال عدم التحديد، ستبقى الشحنات قيد التوصيل للغد)
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onCloseShiftAndArchive(archiveIncludeActive);
                  setShowArchiveConfirm(false);
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
              >
                تأكيد إغلاق الوردية الآن
              </button>
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Previous Archived Shifts History */}
      {filteredArchivedShifts.length > 0 && (
        <section className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#F97316]" />
            <h3 className="text-base font-bold text-slate-900">
              أرشيف الورديات السابقة ({filteredArchivedShifts.length})
            </h3>
          </div>
          <div className="space-y-3">
            {filteredArchivedShifts.map((shift) => (
              <div
                key={shift.id}
                className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 text-sm">
                    وردية يوم{' '}
                    {new Date(shift.closedAt).toLocaleString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-slate-600">
                    <span>إجمالي الشحنات: {shift.totalShipments}</span>
                    <span aria-hidden="true">·</span>
                    <span>المسلمة: {shift.deliveredCount}</span>
                    <span aria-hidden="true">·</span>
                    <span>المرتجعة: {shift.returnedCount}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500">التحصيل: </span>
                    <strong className="font-mono-num text-slate-900">
                      {shift.totalCashCollected.toLocaleString('en-US')} ج.م
                    </strong>
                  </div>
                  {typeof shift.totalExpenses === 'number' && (
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500">المصاريف: </span>
                      <strong className="font-mono-num text-rose-600">
                        -{shift.totalExpenses.toLocaleString('en-US')} ج.م
                      </strong>
                    </div>
                  )}
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500">صافي الربح: </span>
                    <strong className="font-mono-num text-emerald-700">
                      {shift.captainNetProfit.toLocaleString('en-US')} ج.م
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      exportShipmentsToCSV(
                        shift.shipments,
                        `أرشيف-وردية-${shift.id}`
                      )
                    }
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    تحميل CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
