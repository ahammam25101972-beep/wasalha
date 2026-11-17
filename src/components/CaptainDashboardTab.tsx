import React, { useMemo, useState } from 'react';
import {
  AREA_ROUTE_ORDER,
  CairoArea,
  computeShipmentFinancials,
  formatCustomerDeliveryWhatsApp,
  formatEgyptWhatsAppNumber,
  PROGRESS_STEPS,
  Shipment,
  ShipmentStatus,
  STATUS_META,
} from '../types/shipment';
import { InteractiveRouteMap } from './InteractiveRouteMap';
import {
  ArrowLeft,
  CheckCircle2,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  RotateCcw,
  Search,
  Truck,
} from 'lucide-react';

interface CaptainDashboardTabProps {
  shipments: Shipment[];
  onUpdateStatus: (shipmentId: string, newStatus: ShipmentStatus) => void;
  onTrackWaybill: (waybillId: string) => void;
  onNavigateToNewOrder: () => void;
  showToast: (msg: string) => void;
}

type FilterMode = 'active' | 'all' | ShipmentStatus;
type ViewMode = 'both' | 'map' | 'cards';

export const CaptainDashboardTab: React.FC<CaptainDashboardTabProps> = ({
  shipments,
  onUpdateStatus,
  onTrackWaybill,
  onNavigateToNewOrder,
  showToast,
}) => {
  const [statusFilter, setStatusFilter] = useState<FilterMode>('active');
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<CairoArea | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('both');

  // Quick summary counts for the filter bar
  const counts = useMemo(() => {
    const active = shipments.filter(
      (s) => s.status !== 'delivered' && s.status !== 'returned'
    ).length;
    const delivered = shipments.filter((s) => s.status === 'delivered').length;
    const returned = shipments.filter((s) => s.status === 'returned').length;
    return { active, delivered, returned, all: shipments.length };
  }, [shipments]);

  // Distinct governorates present in current shipments
  const activeGovernorates = useMemo(() => {
    const set = new Set<string>();
    shipments.forEach((s) => {
      set.add(s.deliveryGovernorate || 'القاهرة');
    });
    return Array.from(set);
  }, [shipments]);

  // Distinct areas present in current shipments sorted by route order
  const activeAreas = useMemo(() => {
    const set = new Set<CairoArea>();
    shipments.forEach((s) => {
      const gov = s.deliveryGovernorate || 'القاهرة';
      if (selectedGovernorate === 'ALL' || gov === selectedGovernorate) {
        set.add(s.deliveryArea);
      }
    });
    return Array.from(set).sort(
      (a, b) => (AREA_ROUTE_ORDER[a] || 99) - (AREA_ROUTE_ORDER[b] || 99)
    );
  }, [shipments, selectedGovernorate]);

  // Filtered and geographically sorted shipments
  const filteredShipments = useMemo(() => {
    return shipments
      .filter((s) => {
        if (statusFilter === 'active') {
          if (s.status === 'delivered' || s.status === 'returned') return false;
        } else if (statusFilter !== 'all') {
          if (s.status !== statusFilter) return false;
        }

        const deliveryGov = s.deliveryGovernorate || 'القاهرة';
        if (
          selectedGovernorate !== 'ALL' &&
          deliveryGov !== selectedGovernorate
        ) {
          return false;
        }

        if (selectedArea !== 'ALL' && s.deliveryArea !== selectedArea) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchId = s.id.toLowerCase().includes(q);
          const matchRecipient = s.recipientName.toLowerCase().includes(q);
          const matchPhone = s.recipientPhone.includes(q);
          const matchSender = s.senderName.toLowerCase().includes(q);
          const matchArea = s.deliveryArea.toLowerCase().includes(q);
          const matchGov = deliveryGov.toLowerCase().includes(q);
          if (
            !matchId &&
            !matchRecipient &&
            !matchPhone &&
            !matchSender &&
            !matchArea &&
            !matchGov
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const orderA = AREA_ROUTE_ORDER[a.deliveryArea] || 99;
        const orderB = AREA_ROUTE_ORDER[b.deliveryArea] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return b.waybillNumber - a.waybillNumber;
      });
  }, [
    shipments,
    statusFilter,
    selectedGovernorate,
    selectedArea,
    searchQuery,
  ]);

  // Group filtered shipments by Governorate + deliveryArea for clean route execution
  const groupedByArea = useMemo(() => {
    const groups: { area: CairoArea; items: Shipment[] }[] = [];
    const map = new Map<CairoArea, Shipment[]>();
    filteredShipments.forEach((s) => {
      const gov = s.deliveryGovernorate || 'القاهرة';
      const groupLabel = `${gov} - ${s.deliveryArea}`;
      const list = map.get(groupLabel) || [];
      list.push(s);
      map.set(groupLabel, list);
    });
    map.forEach((items, area) => {
      groups.push({ area, items });
    });
    return groups;
  }, [filteredShipments]);

  const getGoogleMapsHref = (shipment: Shipment) => {
    if (shipment.googleMapsLink && shipment.googleMapsLink.trim()) {
      return shipment.googleMapsLink.trim();
    }
    const gov = shipment.deliveryGovernorate || 'القاهرة';
    const query = `${shipment.detailedAddress}, ${shipment.deliveryArea}, ${gov}, مصر`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;
  };

  const getWhatsAppHref = (shipment: Shipment) => {
    const waPhone = formatEgyptWhatsAppNumber(shipment.recipientPhone);
    const msg = formatCustomerDeliveryWhatsApp(shipment);
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  const getNextLogicalStatus = (
    current: ShipmentStatus
  ): ShipmentStatus | null => {
    if (current === 'pending') return 'picked_up';
    if (current === 'picked_up') return 'in_transit';
    if (current === 'in_transit') return 'delivered';
    return null;
  };

  return (
    <div className="space-y-5">
      {/* View Mode Selector Bar: Map + Cards / Map Only / Cards Only */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'both'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5 text-[#F97316]" />
            <span>الخريطة والبطاقات معاً</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'map'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-[#F97316]" />
            <span>خريطة خط السير فقط</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'cards'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#F97316]" />
            <span>بطاقات الشحنات فقط</span>
          </button>
        </div>

        <div className="text-xs text-slate-500">
          الشحنات النشطة اليوم: <strong className="font-mono-num text-slate-900">{counts.active}</strong> · المسلمة: <strong className="font-mono-num text-emerald-700">{counts.delivered}</strong>
        </div>
      </div>

      {/* Interactive Map Section */}
      {(viewMode === 'both' || viewMode === 'map') && (
        <InteractiveRouteMap
          shipments={shipments}
          onUpdateStatus={onUpdateStatus}
          onTrackWaybill={onTrackWaybill}
          showToast={showToast}
        />
      )}

      {/* Delivery Cards Section */}
      {(viewMode === 'both' || viewMode === 'cards') && (
        <>
          {/* Top Route Controls & Interactive Filters */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  بطاقات المشاوير اليومية مرتبة حسب المحافظة والمنطقة
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  الطلبات مرتبة حسب المحافظة والمنطقة الجغرافية لتسهيل خط السير بيد واحدة
                </p>
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث برقم البوليصة، العميل، الهاتف..."
                  className="w-full min-h-[44px] pr-10 pl-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50/60 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

        {/* Interactive Status Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            المشاوير النشطة ({counts.active})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            كل الطلبات ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            قيد الانتظار
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('picked_up')}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === 'picked_up'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            تم الاستلام
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_transit')}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === 'in_transit'
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            جاري التوصيل
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('delivered')}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            تم التسليم ({counts.delivered})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('returned')}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === 'returned'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            مرتجع / ملغي ({counts.returned})
          </button>
        </div>

        {/* Interactive Governorate Filter Bar */}
        {activeGovernorates.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 no-scrollbar">
            <span className="text-xs font-semibold text-slate-500 pl-2 whitespace-nowrap shrink-0">
              تصفية بالمحافظة:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedGovernorate('ALL');
                setSelectedArea('ALL');
              }}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedGovernorate === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              كل المحافظات
            </button>
            {activeGovernorates.map((gov) => (
              <button
                key={gov}
                type="button"
                onClick={() => {
                  setSelectedGovernorate(gov);
                  setSelectedArea('ALL');
                }}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedGovernorate === gov
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {gov}
              </button>
            ))}
          </div>
        )}

        {/* Interactive Geographical Area Filter Bar */}
        {activeAreas.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 no-scrollbar">
            <span className="text-xs font-semibold text-slate-500 pl-2 whitespace-nowrap shrink-0">
              تصفية بالمنطقة:
            </span>
            <button
              type="button"
              onClick={() => setSelectedArea('ALL')}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedArea === 'ALL'
                  ? 'bg-[#F97316] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              جميع المناطق
            </button>
            {activeAreas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedArea === area
                    ? 'bg-[#F97316] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {groupedByArea.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            لا توجد شحنات مطابقة للفلتر الحالي
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            يمكنك عرض كل الطلبات أو إضافة بوليصة شحن جديدة للبدء في تنفيذ المشاوير.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedArea('ALL');
                  setSearchQuery('');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                عرض كل الطلبات ({counts.all})
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateToNewOrder}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              + تسجيل طلب جديد
            </button>
          </div>
        </div>
      ) : (
        /* Geographically Grouped Cards */
        <div className="space-y-6">
          {groupedByArea.map(({ area, items }) => (
            <section key={area} className="space-y-3">
              {/* Area Group Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#F97316] shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    نطاق توصيل: {area}
                  </h3>
                  <span className="text-xs text-slate-500">
                    · {items.length}{' '}
                    {items.length === 1 ? 'شحنة' : 'شحنات'}
                  </span>
                </div>
              </div>

              {/* Cards Grid (1 col on mobile, 2 cols on desktop lg:) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map((shipment) => {
                  const fin = computeShipmentFinancials(shipment);
                  const nextStatus = getNextLogicalStatus(shipment.status);
                  const statusMeta = STATUS_META[shipment.status];

                  return (
                    <article
                      key={shipment.id}
                      className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4"
                    >
                      {/* Top Header: Waybill ID + Unboxed Metadata + Amount to Collect */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            {/* Unboxed static metadata line */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-1">
                              <button
                                type="button"
                                onClick={() => onTrackWaybill(shipment.id)}
                                className="font-mono-num font-bold text-slate-900 hover:text-[#F97316] underline decoration-slate-300 cursor-pointer"
                                dir="ltr"
                              >
                                {shipment.id}
                              </button>
                              <span aria-hidden="true">·</span>
                              <span className={`font-bold ${statusMeta.textColor}`}>
                                {statusMeta.label}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                من: {shipment.senderName} (
                                {shipment.senderType === 'individual'
                                  ? 'فرد / أهالي'
                                  : 'تاجر'}
                                )
                              </span>
                            </div>

                            {/* Primary Title: Recipient Name */}
                            <h4 className="text-lg font-bold text-slate-900 leading-snug">
                              {shipment.recipientName}
                            </h4>
                          </div>

                          {/* Prominent Total Amount to Collect from Customer */}
                          <div className="text-left shrink-0 bg-slate-900 text-white px-3.5 py-2 rounded-xl">
                            <div className="text-[10px] text-slate-300">
                              المطلوب تحصيله
                            </div>
                            <div className="text-lg font-bold font-mono-num text-[#F97316]">
                              {fin.totalToCollectFromCustomer.toLocaleString(
                                'en-US'
                              )}{' '}
                              <span className="text-xs font-normal text-white">
                                ج.م
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Address & Route Info */}
                        <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-2 text-xs sm:text-sm">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <span>
                              استلام: {shipment.pickupGovernorate || 'القاهرة'} ({shipment.pickupArea})
                            </span>
                            <ArrowLeft className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                            <span className="text-slate-900 font-bold">
                              تسليم: {shipment.deliveryGovernorate || 'القاهرة'} ({shipment.deliveryArea})
                            </span>
                          </div>

                          {/* Sender Address & Landmark */}
                          {(shipment.senderAddress || shipment.senderLandmark) && (
                            <div className="text-xs text-slate-600 pb-2 border-b border-slate-200/70 space-y-0.5">
                              {shipment.senderAddress && (
                                <p>
                                  <span className="font-bold text-slate-700">
                                    عنوان الاستلام (المُرسل):
                                  </span>{' '}
                                  {shipment.senderAddress}
                                </p>
                              )}
                              {shipment.senderLandmark && (
                                <p className="text-slate-700">
                                  <span className="font-bold text-[#EA580C]">
                                    علامة مميزة للمُرسل:
                                  </span>{' '}
                                  {shipment.senderLandmark}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Recipient Address & Landmark */}
                          <div className="space-y-0.5">
                            <p className="text-slate-800 font-medium leading-relaxed">
                              <span className="font-bold text-slate-900">
                                عنوان التسليم (المستلم):
                              </span>{' '}
                              {shipment.detailedAddress}
                            </p>
                            {shipment.recipientLandmark && (
                              <p className="text-xs text-emerald-800 font-semibold">
                                علامة مميزة للمستلم: {shipment.recipientLandmark}
                              </p>
                            )}
                          </div>

                          {shipment.notes && (
                            <p className="text-xs text-[#EA580C] font-semibold pt-1 border-t border-slate-200/70">
                              ملاحظة: {shipment.notes}
                            </p>
                          )}
                        </div>

                        {/* Unboxed Financial Breakdown line */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>
                            الأوردر:{' '}
                            <strong className="font-mono-num text-slate-800">
                              {fin.codAmount} ج.م
                            </strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            الشحن:{' '}
                            <strong className="font-mono-num text-slate-800">
                              {fin.shippingFee} ج.م
                            </strong>{' '}
                            (
                            {shipment.shippingBearer === 'recipient'
                              ? 'على المستلم'
                              : 'على التاجر'}
                            )
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num" dir="ltr">
                            {shipment.recipientPhone}
                          </span>
                        </div>
                      </div>

                      {/* 3 Quick Action Buttons (Large One-Handed Touch Targets >= 44px) */}
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-3 gap-2">
                          {/* 1. Direct Call */}
                          <a
                            href={`tel:${shipment.recipientPhone}`}
                            className="min-h-[46px] px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                          >
                            <Phone className="w-4 h-4 text-[#F97316] shrink-0" />
                            <span>اتصال بالعميل</span>
                          </a>

                          {/* 2. Open Google Maps */}
                          <a
                            href={getGoogleMapsHref(shipment)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[46px] px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                          >
                            <Navigation className="w-4 h-4 shrink-0" />
                            <span>خرائط جوجل</span>
                          </a>

                          {/* 3. Ready WhatsApp Message */}
                          <a
                            href={getWhatsAppHref(shipment)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[46px] px-2.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                          >
                            <MessageCircle className="w-4 h-4 shrink-0" />
                            <span>رسالة واتساب</span>
                          </a>
                        </div>

                        {/* One-Tap Status Progression Bar */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>تغيير حالة الشحنة بضغطة واحدة:</span>
                            {nextStatus && (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateStatus(shipment.id, nextStatus)
                                }
                                className="text-[#F97316] font-bold hover:underline cursor-pointer"
                              >
                                الانتقال إلى: {STATUS_META[nextStatus].label} ⬅
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl">
                            {PROGRESS_STEPS.map((st) => {
                              const isCurrent = shipment.status === st;
                              const isCompleted =
                                shipment.status !== 'returned' &&
                                STATUS_META[shipment.status].stepIndex >=
                                  STATUS_META[st].stepIndex;

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => onUpdateStatus(shipment.id, st)}
                                  className={`min-h-[40px] px-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center text-center leading-tight ${
                                    isCurrent
                                      ? st === 'delivered'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-[#F97316] text-white shadow-xs'
                                      : isCompleted
                                      ? 'bg-slate-900 text-white'
                                      : 'text-slate-600 hover:bg-white/70'
                                  }`}
                                >
                                  {STATUS_META[st].shortLabel}
                                </button>
                              );
                            })}

                            {/* Returned / Cancelled Button */}
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStatus(shipment.id, 'returned')
                              }
                              className={`min-h-[40px] px-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center text-center leading-tight ${
                                shipment.status === 'returned'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-rose-700 hover:bg-rose-50'
                              }`}
                            >
                              مرتجع
                            </button>
                          </div>

                          {/* Primary One-Tap Advance CTA for Field Ergonomics */}
                          {nextStatus && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStatus(shipment.id, nextStatus)
                              }
                              className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                nextStatus === 'delivered'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  : 'bg-[#F97316] hover:bg-[#EA580C] text-white shadow-xs'
                              }`}
                            >
                              {nextStatus === 'delivered' ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                              ) : (
                                <Package className="w-4 h-4 shrink-0" />
                              )}
                              <span>
                                تأكيد: {STATUS_META[nextStatus].label}
                                {nextStatus === 'delivered'
                                  ? ` (${fin.totalToCollectFromCustomer} ج.م)`
                                  : ''}
                              </span>
                            </button>
                          )}

                          {shipment.status === 'returned' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStatus(shipment.id, 'in_transit')
                              }
                              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>إعادة تفعيل الشحنة إلى جاري التوصيل</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
};
