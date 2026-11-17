import React from 'react';
import { RealtimeNotification } from '../types/shipment';
import {
  Bell,
  BellRing,
  CheckCheck,
  MapPin,
  PackagePlus,
  Trash2,
  Truck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: RealtimeNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  pushPermission: NotificationPermission;
  onRequestPushPermission: () => void;
  onMarkAllRead: () => void;
  onSelectNotification: (notif: RealtimeNotification) => void;
  onClearAll: () => void;
}

export const NotificationCenterModal: React.FC<
  NotificationCenterModalProps
> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  soundEnabled,
  onToggleSound,
  pushPermission,
  onRequestPushPermission,
  onMarkAllRead,
  onSelectNotification,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const formatTimeAgo = (iso: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diffSec < 60) return 'الآن';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `منذ ${diffHr} ساعة`;
      return new Date(iso).toLocaleDateString('ar-EG');
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[88vh] flex flex-col">
        {/* Mobile grab handle */}
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-[#F97316]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                مركز الإشعارات الفورية للكابتن
              </h2>
              <p className="text-xs text-slate-500">
                تنبيهات الطلبات الجديدة وتحديثات حالة التوصيل لحظياً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] min-w-[42px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar: Push Permission & Sound Toggle */}
        <div className="py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSound}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>التنبيه الصوتي: مفعّل</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>التنبيه الصوتي: صامت</span>
                </>
              )}
            </button>

            {pushPermission !== 'granted' && (
              <button
                type="button"
                onClick={onRequestPushPermission}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>تفعيل إشعارات الجهاز (Push)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح السجل</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                لا توجد إشعارات حالياً
              </div>
              <p className="text-xs text-slate-500">
                ستظهر هنا إشعارات الطلبات الجديدة وتغييرات حالة الشحنات فور حدوثها.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => onSelectNotification(notif)}
                className={`w-full text-right p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  notif.read
                    ? 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    : 'bg-orange-50/60 border-orange-200 text-slate-900 hover:bg-orange-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    notif.type === 'new_order'
                      ? 'bg-[#F97316] text-white'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {notif.type === 'new_order' ? (
                    <PackagePlus className="w-4 h-4" />
                  ) : (
                    <Truck className="w-4 h-4 text-[#F97316]" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {notif.title}
                    </span>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                      {formatTimeAgo(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {notif.body}
                  </p>
                  <div className="text-[11px] font-semibold text-[#EA580C] flex items-center gap-1 pt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>اضغط لعرض الشحنة على الخريطة أو لوحة الكابتن</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
