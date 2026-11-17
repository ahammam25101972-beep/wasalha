/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APP_BRAND_PHONE,
  APP_BRAND_WEBSITE,
  APP_LOGO_URL,
  computeShipmentFinancials,
  CustomAreaRatesMap,
  DailyExpense,
  EgyptGovernorate,
  EXPENSE_CATEGORY_META,
  ExpenseCategory,
  getAreaRateKey,
  getAreasForGovernorate,
  INITIAL_CUSTOM_AREA_RATES,
  PrefilledCustomerSelection,
  RealtimeNotification,
  ShiftArchiveRecord,
  Shipment,
  ShipmentStatus,
  STATUS_META,
} from './types/shipment';
import {
  INITIAL_SAMPLE_EXPENSES,
  INITIAL_SAMPLE_SHIPMENTS,
} from './data/sampleShipments';
import { NewOrderTab } from './components/NewOrderTab';
import { CaptainDashboardTab } from './components/CaptainDashboardTab';
import {
  ClientsSearchTab,
  SavedCustomerRecord,
} from './components/ClientsSearchTab';
import { TrackingTab } from './components/TrackingTab';
import { AccountingTab } from './components/AccountingTab';
import { SettingsModal } from './components/SettingsModal';
import { AreaRatesModal } from './components/AreaRatesModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import {
  AdminAuthModal,
  AdminCredentials,
  DEFAULT_ADMIN_CREDENTIALS,
  SESSION_KEY_ADMIN_AUTH,
  STORAGE_KEY_ADMIN_CREDS,
} from './components/AdminAuthModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
import {
  Bell,
  BellRing,
  Calculator,
  Coins,
  Globe,
  KeyRound,
  Lock as LockIcon,
  LogOut,
  PackagePlus,
  PackageSearch,
  Phone,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  X,
} from 'lucide-react';

type ActiveTab =
  | 'new_order'
  | 'captain'
  | 'clients'
  | 'tracking'
  | 'accounting';

const STORAGE_KEY_SHIPMENTS = 'cairo_captain_shipments_v1';
const STORAGE_KEY_COUNTER = 'cairo_captain_waybill_counter_v1';
const STORAGE_KEY_ARCHIVES = 'cairo_captain_shift_archives_v1';
const STORAGE_KEY_EXPENSES = 'cairo_captain_expenses_v1';
const STORAGE_KEY_CUSTOMERS = 'cairo_captain_customers_v1';
const STORAGE_KEY_AREA_RATES = 'cairo_captain_area_rates_v1';

export default function App() {
  // Admin authentication state (session-persisted so reload in same tab stays unlocked)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(
    () => {
      try {
        return sessionStorage.getItem(SESSION_KEY_ADMIN_AUTH) === 'true';
      } catch {
        return false;
      }
    }
  );
  const [adminAuthModalMode, setAdminAuthModalMode] = useState<
    'login' | 'change_credentials' | null
  >(null);
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ADMIN_CREDS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.username && parsed.password) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
      return DEFAULT_ADMIN_CREDENTIALS;
    }
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    isAdminAuthenticated ? 'captain' : 'new_order'
  );
  const [trackedWaybillId, setTrackedWaybillId] = useState<string>('#SH-1001');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAreaRatesOpen, setIsAreaRatesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePushBanner, setLivePushBanner] =
    useState<RealtimeNotification | null>(null);
  const [prefilledCustomer, setPrefilledCustomer] =
    useState<PrefilledCustomerSelection | null>(null);

  // Load shipments from LocalStorage or initialize with sample shipments
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHIPMENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s: Shipment) => ({
            ...s,
            senderType:
              s.senderType ||
              (s.id === '#SH-1002' ? 'individual' : 'merchant'),
            pickupGovernorate: s.pickupGovernorate || 'القاهرة',
            deliveryGovernorate: s.deliveryGovernorate || 'القاهرة',
            senderAddress:
              s.senderAddress ||
              (s.id === '#SH-1001'
                ? '14 شارع بورسعيد، بجوار سنترال السيدة زينب'
                : s.id === '#SH-1002'
                ? '8 شارع عبد العزيز جاويش، عمارة الأوقاف، الدور الثالث'
                : s.id === '#SH-1003'
                ? 'ممر الكونتيننتال، ميدان الأوبرا، محل رقم 5'
                : ''),
            senderLandmark:
              s.senderLandmark ||
              (s.id === '#SH-1001'
                ? 'أمام مسجد السيدة زينب وبجوار صيدلية العزبي'
                : s.id === '#SH-1002'
                ? 'خلف وزارة الأوقاف وبجوار فرن الحرية'
                : s.id === '#SH-1003'
                ? 'أمام تمثال إبراهيم باشا ومحطة مترو العتبة'
                : ''),
            recipientLandmark:
              s.recipientLandmark ||
              (s.id === '#SH-1001'
                ? 'أمام مستشفى القصر العيني الفرنساوي وبجوار كشري التحرير'
                : s.id === '#SH-1002'
                ? 'أمام مول السراج سيتي وبجوار سوبر ماركت سعودي'
                : s.id === '#SH-1003'
                ? 'بجوار محطة مترو المعادي وأمام صيدلية سيف'
                : ''),
          }));
        }
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_SAMPLE_SHIPMENTS;
  });

  // Load daily expenses from LocalStorage or initialize with sample expenses
  const [expenses, setExpenses] = useState<DailyExpense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXPENSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SAMPLE_EXPENSES;
  });

  // Load custom shipping rates per area
  const [customAreaRates, setCustomAreaRates] = useState<CustomAreaRatesMap>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AREA_RATES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch {
        // ignore
      }
      return INITIAL_CUSTOM_AREA_RATES;
    }
  );

  // Load manually saved customers directory
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomerRecord[]>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // ignore
      }
      return [];
    }
  );

  // Load waybill counter
  const [waybillCounter, setWaybillCounter] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COUNTER);
      if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && num >= 1001) return num;
      }
    } catch {
      // ignore
    }
    return 1004;
  });

  // Load archived shifts
  const [archivedShifts, setArchivedShifts] = useState<ShiftArchiveRecord[]>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ARCHIVES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // ignore
      }
      return [];
    }
  );

  // Sync with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHIPMENTS, JSON.stringify(shipments));
    } catch {
      // ignore
    }
  }, [shipments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    } catch {
      // ignore
    }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_AREA_RATES,
        JSON.stringify(customAreaRates)
      );
    } catch {
      // ignore
    }
  }, [customAreaRates]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_CUSTOMERS,
        JSON.stringify(savedCustomers)
      );
    } catch {
      // ignore
    }
  }, [savedCustomers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COUNTER, String(waybillCounter));
    } catch {
      // ignore
    }
  }, [waybillCounter]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_ARCHIVES,
        JSON.stringify(archivedShifts)
      );
    } catch {
      // ignore
    }
  }, [archivedShifts]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Handlers for Area Shipping Rates Manager
  const handleSetAreaRate = (
    governorate: EgyptGovernorate,
    area: string,
    rate: number
  ) => {
    const key = getAreaRateKey(governorate, area);
    setCustomAreaRates((prev) => ({
      ...prev,
      [key]: Math.max(0, Number(rate) || 0),
    }));
  };

  const handleRemoveAreaRate = (
    governorate: EgyptGovernorate,
    area: string
  ) => {
    const key = getAreaRateKey(governorate, area);
    setCustomAreaRates((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSetBulkGovernorateRate = (
    governorate: EgyptGovernorate,
    rate: number
  ) => {
    const areas = getAreasForGovernorate(governorate, customAreaRates);
    setCustomAreaRates((prev) => {
      const next = { ...prev };
      areas.forEach((a) => {
        next[getAreaRateKey(governorate, a)] = Math.max(0, Number(rate) || 0);
      });
      return next;
    });
  };

  const handleResetDefaultAreaRates = () => {
    setCustomAreaRates(INITIAL_CUSTOM_AREA_RATES);
  };

  // Handlers for remote WebSocket / BroadcastChannel events
  const handleRemoteShipmentCreated = useCallback((newShipment: Shipment) => {
    setShipments((prev) => {
      if (prev.some((s) => s.id === newShipment.id)) return prev;
      return [newShipment, ...prev];
    });
  }, []);

  const handleRemoteStatusUpdated = useCallback((updated: Shipment) => {
    setShipments((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
  }, []);

  const handlePushBanner = useCallback((notif: RealtimeNotification) => {
    setLivePushBanner(notif);
    setTimeout(() => {
      setLivePushBanner((prev) => (prev?.id === notif.id ? null : prev));
    }, 6500);
  }, []);

  const {
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    pushPermission,
    requestPushPermission,
    notifyShipmentCreated,
    notifyStatusChanged,
    markAllAsRead,
    markOneAsRead,
    clearNotifications,
  } = useRealtimeNotifications({
    onRemoteShipmentCreated: handleRemoteShipmentCreated,
    onRemoteStatusUpdated: handleRemoteStatusUpdated,
    onPushBanner: handlePushBanner,
  });

  // Add a new shipment and trigger real-time push notification to captain
  const handleAddShipment = (
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
  ): Shipment => {
    const maxExisting = shipments.reduce(
      (max, s) => Math.max(max, s.waybillNumber || 1000),
      1000
    );
    const nextNum = Math.max(waybillCounter, maxExisting + 1);
    const id = `#SH-${nextNum}`;
    const now = new Date().toISOString();

    const newShipment: Shipment = {
      ...data,
      id,
      waybillNumber: nextNum,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp: now,
          label: `تم تسجيل البوليصة (استلام من ${data.pickupGovernorate || 'القاهرة'} - ${data.pickupArea})`,
        },
      ],
      merchantSettled: false,
      isSample: false,
    };

    setShipments((prev) => [newShipment, ...prev]);
    setWaybillCounter(nextNum + 1);
    setTrackedWaybillId(id);

    // Send real-time push notification to captain's device
    notifyShipmentCreated(newShipment);
    return newShipment;
  };

  // Add daily expense (Fuel, Car Maintenance, Other) with optional custom date
  const handleAddExpense = (
    category: ExpenseCategory,
    amount: number,
    description: string,
    expenseDate?: string
  ) => {
    let createdAtIso = new Date().toISOString();
    if (expenseDate) {
      const todayYmd = new Date().toISOString().slice(0, 10);
      if (expenseDate !== todayYmd) {
        createdAtIso = new Date(`${expenseDate}T12:00:00`).toISOString();
      }
    }
    const newExpense: DailyExpense = {
      id: `EXP-${Date.now().toString().slice(-6)}`,
      category,
      amount: Math.max(0, Number(amount) || 0),
      description,
      createdAt: createdAtIso,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    showToast(
      `تم تسجيل مصروف (${EXPENSE_CATEGORY_META[category].shortLabel}: ${amount} ج.م)`
    );
  };

  // Delete daily expense
  const handleDeleteExpense = (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    showToast('تم حذف المصروف من سجل اليوم');
  };

  // Update shipment status in 1 tap and send real-time status notification
  const handleUpdateStatus = (
    shipmentId: string,
    newStatus: ShipmentStatus
  ) => {
    const target = shipments.find((s) => s.id === shipmentId);
    if (!target || target.status === newStatus) return;

    const oldStatus = target.status;
    const now = new Date().toISOString();
    const fin = computeShipmentFinancials(target);

    let logNote = STATUS_META[newStatus].label;
    if (newStatus === 'picked_up') {
      logNote = `تم الاستلام من المُرسل (${target.pickupGovernorate || 'القاهرة'} - ${target.pickupArea})`;
    } else if (newStatus === 'in_transit') {
      logNote = `جاري التوصيل في اتجاه (${target.deliveryGovernorate || 'القاهرة'} - ${target.deliveryArea})`;
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
        {
          status: newStatus,
          timestamp: now,
          label: logNote,
        },
      ],
    };

    setShipments((prev) =>
      prev.map((s) => (s.id === shipmentId ? updatedShipment : s))
    );

    // Notify captain of status transition
    notifyStatusChanged(updatedShipment, oldStatus, newStatus);
  };

  // Settle or unsettle sender balance
  const handleSettleMerchant = (
    senderName: string,
    senderPhone: string,
    settled: boolean
  ) => {
    const now = new Date().toISOString();
    setShipments((prev) =>
      prev.map((s) => {
        if (
          s.senderName.trim() === senderName.trim() &&
          s.senderPhone.trim() === senderPhone.trim() &&
          s.status === 'delivered'
        ) {
          return {
            ...s,
            merchantSettled: settled,
            settledAt: settled ? now : undefined,
          };
        }
        return s;
      })
    );
    showToast(
      settled
        ? `تم تأكيد توريد حساب المُرسل (${senderName}) وتصفير رصيده`
        : `تم التراجع عن التوريد للمُرسل (${senderName})`
    );
  };

  // Close current shift and archive completed/returned orders + expenses
  const handleCloseShiftAndArchive = (archiveAllIncludingActive: boolean) => {
    const toArchive = archiveAllIncludingActive
      ? shipments
      : shipments.filter(
          (s) => s.status === 'delivered' || s.status === 'returned'
        );

    if (toArchive.length === 0) {
      showToast('لا توجد شحنات مكتملة أو مرتجعة لأرشفتها حالياً');
      return;
    }

    let deliveredCount = 0;
    let returnedCount = 0;
    let totalCashCollected = 0;
    let grossShippingProfit = 0;
    let merchantNetTotal = 0;

    toArchive.forEach((s) => {
      const fin = computeShipmentFinancials(s);
      if (s.status === 'delivered') {
        deliveredCount++;
        totalCashCollected += fin.totalToCollectFromCustomer;
        grossShippingProfit += fin.captainProfit;
        merchantNetTotal += fin.netPayableToMerchant;
      } else if (s.status === 'returned') {
        returnedCount++;
      }
    });

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );
    const captainNetProfit = grossShippingProfit - totalExpenses;

    const record: ShiftArchiveRecord = {
      id: `SHIFT-${Date.now().toString().slice(-5)}`,
      closedAt: new Date().toISOString(),
      totalShipments: toArchive.length,
      deliveredCount,
      returnedCount,
      totalCashCollected,
      captainGrossProfit: grossShippingProfit,
      captainNetProfit,
      totalExpenses,
      merchantNetTotal,
      shipments: toArchive,
      expenses: [...expenses],
    };

    setArchivedShifts((prev) => [record, ...prev]);
    if (archiveAllIncludingActive) {
      setShipments([]);
    } else {
      setShipments((prev) =>
        prev.filter((s) => s.status !== 'delivered' && s.status !== 'returned')
      );
    }
    setExpenses([]);
    showToast(
      `تم إغلاق الوردية وأرشفة ${toArchive.length} شحنة وتصفير مصاريف اليوم بنجاح`
    );
  };

  // Clear sample data and start live
  const handleClearSampleDataAndStartLive = () => {
    setShipments((prev) => prev.filter((s) => !s.isSample));
    setExpenses([]);
    setWaybillCounter(1001);
    showToast(
      'تم مسح البيانات التجريبية — يمكنك الآن تسجيل طلباتك ومصاريفك الفعلية'
    );
  };

  // Restore sample data
  const handleRestoreSampleData = () => {
    setShipments(INITIAL_SAMPLE_SHIPMENTS);
    setExpenses(INITIAL_SAMPLE_EXPENSES);
    setWaybillCounter(1004);
    setTrackedWaybillId('#SH-1001');
    showToast('تمت استعادة البيانات التجريبية بنجاح');
  };

  // Import shipments from JSON or CSV
  const handleImportShipments = (imported: Shipment[], merge: boolean) => {
    if (!merge) {
      setShipments(imported);
      return;
    }
    setShipments((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const newOnes = imported.filter((s) => !existingIds.has(s.id));
      return [...newOnes, ...prev];
    });
  };

  // Select customer from directory to pre-fill New Order form
  const handleSelectCustomerForNewOrder = (
    selection: PrefilledCustomerSelection
  ) => {
    setPrefilledCustomer(selection);
    setActiveTab('new_order');
  };

  // Compute Day-Wide Shipping Fees & Net Profit for the Bottom Summary Bar
  const dayShippingMetrics = useMemo(() => {
    let deliveredShippingFees = 0;
    let activeShippingFees = 0;
    let totalDayShippingFees = 0;

    shipments.forEach((s) => {
      const fee = Math.max(0, Number(s.shippingFee) || 0);
      if (s.status === 'delivered') {
        deliveredShippingFees += fee;
        totalDayShippingFees += fee;
      } else if (s.status !== 'returned') {
        activeShippingFees += fee;
        totalDayShippingFees += fee;
      }
    });

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );
    const netProfitAfterExpenses = deliveredShippingFees - totalExpenses;

    return {
      deliveredShippingFees,
      activeShippingFees,
      totalDayShippingFees,
      totalExpenses,
      netProfitAfterExpenses,
    };
  }, [shipments, expenses]);

  const hasSampleData = shipments.some((s) => s.isSample);
  const activeRunCount = shipments.filter(
    (s) => s.status !== 'delivered' && s.status !== 'returned'
  ).length;

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem(SESSION_KEY_ADMIN_AUTH, 'true');
    } catch {
      // ignore
    }
    setActiveTab('captain');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem(SESSION_KEY_ADMIN_AUTH);
    } catch {
      // ignore
    }
    setActiveTab('new_order');
    showToast('تم الخروج من لوحة التحكم والعودة لواجهة العملاء');
  };

  const handleUpdateAdminCredentials = (next: AdminCredentials) => {
    setAdminCredentials(next);
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN_CREDS, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] ${
        isAdminAuthenticated ? 'pb-32' : 'pb-20'
      }`}
    >
      <OfflineIndicator />

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-16 bg-[#0F172A] text-white border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Logo + Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab(isAdminAuthenticated ? 'captain' : 'new_order');
          }}
          className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <img
            src={APP_LOGO_URL}
            alt="شعار وصلها لي - أسهل توصيل"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-[#F97316] bg-white shadow-sm shrink-0"
          />
          <span>وصلها لي · أسهل توصيل</span>
        </a>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('new_order')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-1 ${
              activeTab === 'new_order'
                ? 'text-white border-b-2 border-[#F97316] font-bold'
                : ''
            }`}
          >
            {isAdminAuthenticated ? 'تسجيل طلب جديد' : 'اطلب توصيل شحنة الآن'}
          </button>

          {isAdminAuthenticated && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('captain')}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-1 ${
                  activeTab === 'captain'
                    ? 'text-white border-b-2 border-[#F97316] font-bold'
                    : ''
                }`}
              >
                لوحة الكابتن ({activeRunCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clients')}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-1 ${
                  activeTab === 'clients'
                    ? 'text-white border-b-2 border-[#F97316] font-bold'
                    : ''
                }`}
              >
                بحث عملاء التوصيل
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('tracking')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-1 ${
              activeTab === 'tracking'
                ? 'text-white border-b-2 border-[#F97316] font-bold'
                : ''
            }`}
          >
            تتبع شحنتك
          </button>

          {isAdminAuthenticated && (
            <button
              type="button"
              onClick={() => setActiveTab('accounting')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-1 ${
                activeTab === 'accounting'
                  ? 'text-white border-b-2 border-[#F97316] font-bold'
                  : ''
              }`}
            >
              الحسابات والميزانية
            </button>
          )}
        </nav>

        {/* Zone 3: 1 primary action button (Admin Login in Customer Mode OR Notifications in Admin Mode) */}
        <div className="flex items-center shrink-0">
          {isAdminAuthenticated ? (
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#F97316] shrink-0" />
              <span>
                إشعارات الكابتن {unreadCount > 0 ? `(${unreadCount})` : ''}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAdminAuthModalMode('login')}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LockIcon className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
              <span>دخول الإدارة / الكابتن</span>
            </button>
          )}
        </div>
      </header>

      {/* Real-time Incoming Push Notification Banner (Admin Only) */}
      {isAdminAuthenticated && livePushBanner && (
        <div className="w-full max-w-2xl mx-auto px-4 pt-3 z-40">
          <div className="rounded-2xl bg-slate-900 text-white p-4 shadow-xl border border-slate-700 flex items-start justify-between gap-3">
            <div
              onClick={() => {
                markOneAsRead(livePushBanner.id);
                setTrackedWaybillId(livePushBanner.waybillId);
                setActiveTab('captain');
                setLivePushBanner(null);
              }}
              className="flex items-start gap-3 cursor-pointer flex-1 min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#F97316]">
                  إشعار فوري للكابتن · الآن
                </div>
                <div className="text-sm font-bold text-white truncate mt-0.5">
                  {livePushBanner.title}
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {livePushBanner.body}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLivePushBanner(null)}
              className="min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="إغلاق الإشعار"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Brand Identity & Workspace Banner (Adapts between Customer Portal and Admin Control Panel) */}
        <div className="rounded-2xl bg-white p-4 sm:px-5 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={APP_LOGO_URL}
              alt="شعار وصلها لي - أسهل توصيل"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#F97316] shadow-md bg-white shrink-0"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  وصلها لي — أسهل توصيل
                </h1>
                <span className="text-xs font-bold text-[#EA580C]">
                  {isAdminAuthenticated
                    ? '· لوحة تحكم الإدارة والكابتن'
                    : '· شحن وتوصيل فوري لكافة المحافظات'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <a
                  href={`tel:${APP_BRAND_PHONE}`}
                  className="inline-flex items-center gap-1 font-bold font-mono-num text-slate-800 hover:text-[#F97316] transition-colors"
                  dir="ltr"
                >
                  <Phone className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>{APP_BRAND_PHONE}</span>
                </a>
                <span className="text-slate-300" aria-hidden="true">
                  |
                </span>
                <a
                  href={`https://${APP_BRAND_WEBSITE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                  dir="ltr"
                >
                  <Globe className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>{APP_BRAND_WEBSITE}</span>
                </a>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                <span>
                  {isAdminAuthenticated
                    ? hasSampleData
                      ? 'وضع الإدارة: يتم حالياً عرض بيانات تجريبية لتجربة البحث في العملاء والخريطة وضبط الميزانية.'
                      : 'وضع الإدارة مفعل — يمكنك متابعة الكابتن والعملاء والحسابات والميزانية وأسعار الشحن.'
                    : 'سجّل بيانات المُرسل والمستلم وتفاصيل الشحنة أدناه لإصدار بوليصة الشحن الفورية وطلب المندوب.'}
                </span>
              </p>
            </div>
          </div>

          {isAdminAuthenticated ? (
            /* Admin Control Panel Quick Actions */
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAreaRatesOpen(true)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] border border-orange-200 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5 shrink-0" />
                <span>أسعار الشحن لكل منطقة</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminAuthModalMode('change_credentials')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                <span>يوزر وباسورد الإدارة</span>
              </button>

              {hasSampleData && (
                <button
                  type="button"
                  onClick={handleClearSampleDataAndStartLive}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>مسح التجريبي</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                <span>النسخ الاحتياطي</span>
              </button>

              <button
                type="button"
                onClick={handleAdminLogout}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                <span>خروج (وضع العميل)</span>
              </button>
            </div>
          ) : (
            /* Customer Quick Action Buttons */
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('new_order')}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'new_order'
                    ? 'bg-[#F97316] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <PackagePlus className="w-4 h-4 shrink-0" />
                <span>تسجيل شحنة جديدة</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tracking')}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'tracking'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <PackageSearch className="w-4 h-4 shrink-0" />
                <span>تتبع شحنتك برقم البوليصة</span>
              </button>
            </div>
          )}
        </div>

        {/* Active Tab View */}
        {(activeTab === 'new_order' ||
          (!isAdminAuthenticated && activeTab !== 'tracking')) && (
          <NewOrderTab
            shipments={shipments}
            customAreaRates={customAreaRates}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAreaRatesModal={() => setIsAreaRatesOpen(true)}
            prefilledCustomer={prefilledCustomer}
            onClearPrefilledCustomer={() => setPrefilledCustomer(null)}
            onAddShipment={handleAddShipment}
            onNavigateToCaptain={() => {
              if (isAdminAuthenticated) setActiveTab('captain');
            }}
            onTrackWaybill={(id) => {
              setTrackedWaybillId(id);
              setActiveTab('tracking');
            }}
            showToast={showToast}
          />
        )}

        {isAdminAuthenticated && activeTab === 'captain' && (
          <CaptainDashboardTab
            shipments={shipments}
            onUpdateStatus={handleUpdateStatus}
            onTrackWaybill={(id) => {
              setTrackedWaybillId(id);
              setActiveTab('tracking');
            }}
            onNavigateToNewOrder={() => setActiveTab('new_order')}
            showToast={showToast}
          />
        )}

        {isAdminAuthenticated && activeTab === 'clients' && (
          <ClientsSearchTab
            shipments={shipments}
            savedCustomers={savedCustomers}
            onAddSavedCustomer={(c) => {
              const newRecord: SavedCustomerRecord = {
                ...c,
                id: `CUST-${Date.now().toString().slice(-6)}`,
              };
              setSavedCustomers((prev) => [newRecord, ...prev]);
              showToast(`تم حفظ العميل (${c.name}) في دليل العملاء`);
            }}
            onStartOrderForCustomer={handleSelectCustomerForNewOrder}
            onTrackWaybill={(id) => {
              setTrackedWaybillId(id);
              setActiveTab('tracking');
            }}
          />
        )}

        {activeTab === 'tracking' && (
          <TrackingTab
            shipments={shipments}
            isAdminAuthenticated={isAdminAuthenticated}
            initialWaybillId={trackedWaybillId}
            showToast={showToast}
          />
        )}

        {isAdminAuthenticated && activeTab === 'accounting' && (
          <AccountingTab
            shipments={shipments}
            expenses={expenses}
            archivedShifts={archivedShifts}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onSettleMerchant={handleSettleMerchant}
            onCloseShiftAndArchive={handleCloseShiftAndArchive}
            showToast={showToast}
          />
        )}
      </main>

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 text-xs sm:text-sm font-bold whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* Persistent Bottom Daily Shipping Fees Summary Bar (VISIBLE ONLY IN PROTECTED ADMIN/CAPTAIN PANEL) */}
      {isAdminAuthenticated && (
        <div
          role="region"
          aria-label="شريط إجمالي مصاريف الشحن لليوم كله"
          className="fixed bottom-16 left-0 right-0 z-30 bg-[#0F172A] text-white border-t border-slate-800 px-3 sm:px-6 py-2 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Left/Right Metrics: Total Shipping Fees for Entire Day */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#F97316] shrink-0" />
                <span className="text-slate-300 font-medium">
                  إجمالي مصاريف الشحن لليوم كله:
                </span>
                <strong className="text-sm sm:text-base font-bold font-mono-num text-[#F97316]">
                  {dayShippingMetrics.totalDayShippingFees.toLocaleString(
                    'en-US'
                  )}{' '}
                  ج.م
                </strong>
              </div>

              <span className="hidden sm:inline text-slate-600" aria-hidden="true">
                |
              </span>

              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-300">
                <span>
                  مُحصّل (مسلم):{' '}
                  <strong className="font-mono-num text-emerald-400">
                    {dayShippingMetrics.deliveredShippingFees.toLocaleString(
                      'en-US'
                    )}{' '}
                    ج.م
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  قيد التوصيل:{' '}
                  <strong className="font-mono-num text-amber-300">
                    {dayShippingMetrics.activeShippingFees.toLocaleString(
                      'en-US'
                    )}{' '}
                    ج.م
                  </strong>
                </span>
                <span className="hidden md:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden md:inline">
                  صافي الربح بعد المصاريف:{' '}
                  <strong className="font-mono-num text-white">
                    {dayShippingMetrics.netProfitAfterExpenses.toLocaleString(
                      'en-US'
                    )}{' '}
                    ج.م
                  </strong>
                </span>
              </div>
            </div>

            {/* Quick Action Buttons on the Bottom Bar */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAreaRatesOpen(true)}
                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Coins className="w-3.5 h-3.5 shrink-0" />
                <span>أسعار الشحن للمناطق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar (2 Tabs for Public Customers vs. 5 Tabs for Authenticated Admin/Captain) */}
      <nav
        aria-label="التنقل الرئيسي"
        className={`fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 grid ${
          isAdminAuthenticated ? 'grid-cols-5' : 'grid-cols-2'
        } items-center px-1`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('new_order')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
            activeTab === 'new_order'
              ? 'text-[#F97316] font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <PackagePlus className="w-5 h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">
            {isAdminAuthenticated ? 'تسجيل طلب' : 'اطلب توصيل شحنة'}
          </span>
        </button>

        {isAdminAuthenticated && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('captain')}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                activeTab === 'captain'
                  ? 'text-[#F97316] font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <Truck className="w-5 h-5 shrink-0" />
              <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">
                الكابتن ({activeRunCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('clients')}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                activeTab === 'clients'
                  ? 'text-[#F97316] font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">
                بحث العملاء
              </span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('tracking')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
            activeTab === 'tracking'
              ? 'text-[#F97316] font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <PackageSearch className="w-5 h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">
            تتبع الشحنة
          </span>
        </button>

        {isAdminAuthenticated && (
          <button
            type="button"
            onClick={() => setActiveTab('accounting')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              activeTab === 'accounting'
                ? 'text-[#F97316] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Calculator className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">
              الحسابات والميزانية
            </span>
          </button>
        )}
      </nav>

      {/* Admin Login & Credentials Management Modal */}
      <AdminAuthModal
        isOpen={adminAuthModalMode !== null}
        mode={adminAuthModalMode || 'login'}
        currentCredentials={adminCredentials}
        onClose={() => setAdminAuthModalMode(null)}
        onLoginSuccess={handleAdminLoginSuccess}
        onUpdateCredentials={handleUpdateAdminCredentials}
        onLogout={handleAdminLogout}
        showToast={showToast}
      />

      {/* Area Shipping Rates Manager Modal (Admin Only) */}
      <AreaRatesModal
        isOpen={isAreaRatesOpen}
        onClose={() => setIsAreaRatesOpen(false)}
        customAreaRates={customAreaRates}
        onSetAreaRate={handleSetAreaRate}
        onRemoveAreaRate={handleRemoveAreaRate}
        onSetBulkGovernorateRate={handleSetBulkGovernorateRate}
        onResetDefaultRates={handleResetDefaultAreaRates}
        showToast={showToast}
      />

      {/* Real-Time Notification Center Modal (Admin Only) */}
      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        pushPermission={pushPermission}
        onRequestPushPermission={async () => {
          const perm = await requestPushPermission();
          if (perm === 'granted') {
            showToast('تم تفعيل إشعارات الدفع (Push Notifications) بنجاح');
          }
        }}
        onMarkAllRead={markAllAsRead}
        onSelectNotification={(notif) => {
          markOneAsRead(notif.id);
          setTrackedWaybillId(notif.waybillId);
          setActiveTab('captain');
          setIsNotificationsOpen(false);
        }}
        onClearAll={clearNotifications}
      />

      {/* Settings & Backup Modal (Admin Only) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        shipments={shipments}
        onImportShipments={handleImportShipments}
        onClearSampleDataAndStartLive={handleClearSampleDataAndStartLive}
        onRestoreSampleData={handleRestoreSampleData}
        showToast={showToast}
      />
    </div>
  );
}
