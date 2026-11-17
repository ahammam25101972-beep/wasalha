import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  CAIRO_AREA_COORDS,
  CAIRO_AREAS,
  CairoArea,
  calculateDistanceKm,
  computeShipmentFinancials,
  formatCustomerDeliveryWhatsApp,
  formatEgyptWhatsAppNumber,
  getShipmentCoordinates,
  LatLngPoint,
  optimizeDeliveryRouteByProximity,
  RouteStopPoint,
  Shipment,
  ShipmentStatus,
  STATUS_META,
} from '../types/shipment';
import {
  CheckCircle2,
  Compass,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Route as RouteIcon,
  Store,
  Truck,
  User,
} from 'lucide-react';

interface InteractiveRouteMapProps {
  shipments: Shipment[];
  onUpdateStatus: (shipmentId: string, newStatus: ShipmentStatus) => void;
  onTrackWaybill: (waybillId: string) => void;
  showToast: (msg: string) => void;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

interface MapPolylineInstance {
  setMap: (map: unknown) => void;
  setOptions: (opts: Record<string, unknown>) => void;
}

/**
 * Child component inside <GoogleMap> that uses the modern Routes API (`Route.computeRoutes`)
 * to render the active route polyline between the Captain's position and the next stop.
 */
const ActiveRoutePolylineOverlay: React.FC<{
  captainPos: LatLngPoint;
  orderedStops: RouteStopPoint[];
}> = ({ captainPos, orderedStops }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<MapPolylineInstance[]>([]);
  const fallbackLineRef = useRef<MapPolylineInstance | null>(null);

  useEffect(() => {
    if (!map) return;

    // Clear previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    if (fallbackLineRef.current) {
      fallbackLineRef.current.setMap(null);
      fallbackLineRef.current = null;
    }

    if (orderedStops.length === 0) return;

    const pathCoords: LatLngPoint[] = [
      captainPos,
      ...orderedStops.map((st) => st.position),
    ];

    // Draw immediate connecting polyline across all ordered stops
    const winGoogle = (
      window as unknown as {
        google?: {
          maps?: {
            Polyline?: new (opts: Record<string, unknown>) => MapPolylineInstance;
          };
        };
      }
    ).google;

    if (winGoogle?.maps?.Polyline) {
      fallbackLineRef.current = new winGoogle.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#F97316',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map,
      });
    }

    // Also compute road route for the primary leg using modern Route.computeRoutes
    const routeClass = (
      routesLib as unknown as {
        Route?: {
          computeRoutes?: (
            req: unknown
          ) => Promise<{
            routes?: Array<{ createPolylines: () => MapPolylineInstance[] }>;
          }>;
        };
      }
    )?.Route;

    if (routeClass?.computeRoutes) {
      const firstStop = orderedStops[0];
      const request = {
        origin: captainPos,
        destination: firstStop.position,
        travelMode: 'DRIVING',
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
      };

      routeClass
        .computeRoutes(request)
        .then(({ routes }) => {
          if (!routes || routes.length === 0) return;
          const primaryRoute = routes[0];
          const routePolylines = primaryRoute.createPolylines();
          routePolylines.forEach((pl) => {
            pl.setOptions({
              strokeColor: '#0F172A',
              strokeWeight: 6,
            });
            pl.setMap(map);
          });
          polylinesRef.current = routePolylines;
        })
        .catch((err: unknown) => {
          console.warn('Unable to load route data:', err);
        });
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      if (fallbackLineRef.current) {
        fallbackLineRef.current.setMap(null);
        fallbackLineRef.current = null;
      }
    };
  }, [map, routesLib, captainPos, orderedStops]);

  return null;
};

export const InteractiveRouteMap: React.FC<InteractiveRouteMapProps> = ({
  shipments,
  onUpdateStatus,
  onTrackWaybill,
  showToast,
}) => {
  // Captain current position (defaults to Tahrir / Downtown Cairo, updatable via live GPS or quick area selector)
  const [captainAreaAnchor, setCaptainAreaAnchor] =
    useState<CairoArea>('وسط البلد');
  const [captainPosition, setCaptainPosition] = useState<LatLngPoint>(
    CAIRO_AREA_COORDS['وسط البلد']
  );
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [showDeliveredPins, setShowDeliveredPins] = useState(false);
  const [isRouteOptimized, setIsRouteOptimized] = useState(true);

  // Compute all map markers (Pickup points + Delivery points) for the day
  const allPoints = useMemo(() => {
    const points: RouteStopPoint[] = [];
    shipments.forEach((s) => {
      if (!showDeliveredPins && (s.status === 'delivered' || s.status === 'returned')) {
        return;
      }
      const { pickupCoords, deliveryCoords } = getShipmentCoordinates(s);
      const pickupGov = s.pickupGovernorate || 'القاهرة';
      const deliveryGov = s.deliveryGovernorate || 'القاهرة';

      // Pickup point (active if shipment is still 'pending')
      points.push({
        id: `${s.id}-pickup`,
        waybillId: s.id,
        stopType: 'pickup',
        title: `نقطة استلام: ${s.senderName}`,
        subtitle: `طرد للعميل: ${s.recipientName}`,
        governorate: pickupGov,
        area: s.pickupArea,
        address:
          s.senderAddress || `استلام من المُرسل في ${pickupGov} - ${s.pickupArea}`,
        landmark: s.senderLandmark,
        phone: s.senderPhone,
        position: pickupCoords,
        shipment: s,
        distanceFromPrevKm: 0,
        distanceFromCaptainKm: calculateDistanceKm(
          captainPosition,
          pickupCoords
        ),
        estimatedMinutes: Math.max(
          4,
          Math.round(calculateDistanceKm(captainPosition, pickupCoords) * 3.2)
        ),
      });

      // Delivery point
      points.push({
        id: `${s.id}-delivery`,
        waybillId: s.id,
        stopType: 'delivery',
        title: `نقطة تسليم: ${s.recipientName}`,
        subtitle: `من المُرسل: ${s.senderName}`,
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
        estimatedMinutes: Math.max(
          4,
          Math.round(calculateDistanceKm(captainPosition, deliveryCoords) * 3.2)
        ),
      });
    });
    return points;
  }, [shipments, captainPosition, showDeliveredPins]);

  // Proximity-optimized sequence of active stops
  const optimizedStops = useMemo(() => {
    return optimizeDeliveryRouteByProximity(shipments, captainPosition);
  }, [shipments, captainPosition]);

  const totalRouteKm = useMemo(() => {
    return (
      Math.round(
        optimizedStops.reduce((sum, st) => sum + st.distanceFromPrevKm, 0) * 10
      ) / 10
    );
  }, [optimizedStops]);

  const totalRouteMinutes = useMemo(() => {
    return optimizedStops.reduce((sum, st) => sum + st.estimatedMinutes, 0);
  }, [optimizedStops]);

  const selectedStop = useMemo(() => {
    if (!selectedStopId) return optimizedStops[0] || allPoints[0] || null;
    return (
      allPoints.find((p) => p.id === selectedStopId) ||
      optimizedStops.find((p) => p.id === selectedStopId) ||
      null
    );
  }, [selectedStopId, allPoints, optimizedStops]);

  // Request live GPS position from Captain's device (with explicit user consent)
  const handleLocateCaptainGps = () => {
    if (!('geolocation' in navigator)) {
      showToast('جهازك لا يدعم تحديد الموقع الجغرافي GPS');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setIsGpsActive(true);
        setCaptainPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        showToast('تم تحديث موقع الكابتن الحالي عبر GPS وإعادة ترتيب الأقرب');
      },
      () => {
        setIsLocating(false);
        showToast(
          'تعذر الوصول لـ GPS الجهاز — يمكنك اختيار منطقتك الحالية من القائمة'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSelectAnchorArea = (area: CairoArea) => {
    setCaptainAreaAnchor(area);
    setIsGpsActive(false);
    setCaptainPosition(CAIRO_AREA_COORDS[area]);
    showToast(`تم تحديد موقع الكابتن في (${area}) وتحديث المسافات`);
  };

  const getNextLogicalStatus = (
    current: ShipmentStatus
  ): ShipmentStatus | null => {
    if (current === 'pending') return 'picked_up';
    if (current === 'picked_up') return 'in_transit';
    if (current === 'in_transit') return 'delivered';
    return null;
  };

  // Convert lat/lng to normalized SVG coordinates (0..1000 x 0..560) for the interactive Cairo Map Radar when API key is not configured
  const projectToSvg = (pt: LatLngPoint) => {
    // Greater Cairo bounding box: lat [29.94 .. 30.11], lng [31.20 .. 31.36]
    const minLat = 29.94;
    const maxLat = 30.11;
    const minLng = 31.2;
    const maxLng = 31.36;

    const clampedLat = Math.max(minLat, Math.min(maxLat, pt.lat));
    const clampedLng = Math.max(minLng, Math.min(maxLng, pt.lng));

    const x = 80 + ((clampedLng - minLng) / (maxLng - minLng)) * 840;
    const y = 500 - ((clampedLat - minLat) / (maxLat - minLat)) * 430;
    return { x, y };
  };

  return (
    <div className="space-y-5">
      {/* Top Map Control Bar: Captain Location & Proximity Route Optimization */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-[#F97316]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                الخريطة التفاعلية لنقاط الاستلام والتسليم وتحسين خط السير
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعرض موقع الكابتن الحالي بالنسبة لجميع نقاط الاستلام والتسليم وترتب المشاوير تلقائياً حسب الأقرب
              </p>
            </div>
          </div>

          {/* Captain Location Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleLocateCaptainGps}
              disabled={isLocating}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LocateFixed className="w-4 h-4 text-[#F97316] shrink-0" />
              <span>
                {isLocating
                  ? 'جاري تحديد موقعك...'
                  : isGpsActive
                  ? 'موقعي عبر GPS (نشط)'
                  : 'تحديد موقعي الحالي (GPS)'}
              </span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl min-h-[44px]">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                نقطة تمركز الكابتن:
              </span>
              <select
                value={captainAreaAnchor}
                onChange={(e) =>
                  handleSelectAnchorArea(e.target.value as CairoArea)
                }
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {CAIRO_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsRouteOptimized(true);
                if (optimizedStops[0]) {
                  setSelectedStopId(optimizedStops[0].id);
                }
                showToast(
                  `تم تحسين خط السير لـ ${optimizedStops.length} محطة حسب الأقرب لموقعك`
                );
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RouteIcon className="w-4 h-4 shrink-0" />
              <span>رتّب خط السير حسب الأقرب</span>
            </button>
          </div>
        </div>

        {/* Map Legend & Summary Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <span className="font-bold text-slate-900">
              دليل نقاط الخريطة:
            </span>
            <span className="text-emerald-700 font-bold">
              ● موقع الكابتن الحالي ({isGpsActive ? 'GPS مباشر' : captainAreaAnchor})
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-blue-700 font-bold">
              ■ نقاط استلام من التجار
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#EA580C] font-bold">
              ▲ نقاط تسليم العملاء
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeliveredPins}
                onChange={(e) => setShowDeliveredPins(e.target.checked)}
                className="rounded accent-[#F97316]"
              />
              <span>إظهار الشحنات المكتملة</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Interactive Map Canvas (7 cols) + Proximity Route Queue & Selected Stop Details (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Map Viewport (7 cols on lg:) */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          {GOOGLE_MAPS_API_KEY ? (
            <div className="h-[460px] sm:h-[520px] w-full relative">
              <APIProvider
                apiKey={GOOGLE_MAPS_API_KEY}
                language="ar"
                region="EG"
                libraries={['marker', 'routes']}
              >
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={captainPosition}
                  defaultZoom={12}
                  gestureHandling="greedy"
                  internalUsageAttributionIds={[
                    'gmp_mcp_codeassist_v1_aistudio',
                  ]}
                  className="w-full h-full"
                >
                  {/* Route Polyline Overlay */}
                  {isRouteOptimized && (
                    <ActiveRoutePolylineOverlay
                      captainPos={captainPosition}
                      orderedStops={optimizedStops}
                    />
                  )}

                  {/* Captain's Current Location Marker */}
                  <AdvancedMarker
                    position={captainPosition}
                    title="موقع الكابتن الحالي"
                  >
                    <Pin
                      background="#10B981"
                      borderColor="#0F172A"
                      glyphColor="#FFFFFF"
                      scale={1.3}
                    />
                  </AdvancedMarker>

                  {/* All Pickup & Delivery Point Markers */}
                  {allPoints.map((pt) => {
                    const orderIdx = optimizedStops.findIndex(
                      (st) => st.id === pt.id
                    );
                    const isPickup = pt.stopType === 'pickup';
                    const isDelivered = pt.shipment.status === 'delivered';

                    return (
                      <AdvancedMarker
                        key={pt.id}
                        position={pt.position}
                        onClick={() => setSelectedStopId(pt.id)}
                        title={`${pt.title} (${pt.waybillId})`}
                      >
                        <Pin
                          background={
                            isDelivered
                              ? '#10B981'
                              : isPickup
                              ? '#2563EB'
                              : '#F97316'
                          }
                          borderColor="#0F172A"
                          glyphColor="#FFFFFF"
                          glyphText={
                            orderIdx >= 0 ? String(orderIdx + 1) : undefined
                          }
                          scale={selectedStop?.id === pt.id ? 1.35 : 1.1}
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {/* InfoWindow for Selected Stop */}
                  {selectedStop && (
                    <InfoWindow
                      position={selectedStop.position}
                      onCloseClick={() => setSelectedStopId(null)}
                      maxWidth={260}
                    >
                      <div className="text-right font-sans p-1 space-y-1.5" dir="rtl">
                        <div className="text-xs font-bold text-slate-900">
                          {selectedStop.waybillId} · {selectedStop.title}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {selectedStop.area} — {selectedStop.address}
                        </div>
                        <div className="text-[11px] font-bold text-[#EA580C]">
                          يبعد عنك: {selectedStop.distanceFromCaptainKm} كم (≈{' '}
                          {selectedStop.estimatedMinutes} دقيقة)
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </APIProvider>
            </div>
          ) : (
            /* Interactive Cairo Geospatial Route Map Canvas (Works 100% immediately even without an external API key) */
            <div className="h-[460px] sm:h-[520px] w-full relative bg-[#0F172A] flex flex-col justify-between overflow-hidden select-none">
              <svg
                viewBox="0 0 1000 560"
                className="w-full h-full object-cover"
                aria-label="خريطة القاهرة التفاعلية لخط السير"
              >
                <defs>
                  <pattern
                    id="cairoGrid"
                    width="50"
                    height="50"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="#1E293B"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>

                {/* Map Background Grid */}
                <rect width="1000" height="560" fill="url(#cairoGrid)" />

                {/* Nile River Stylized Geographical Path through Cairo */}
                <path
                  d="M 245 0 C 255 140, 225 260, 210 360 C 195 450, 240 510, 260 560"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="28"
                  strokeOpacity="0.28"
                  strokeLinecap="round"
                />
                <path
                  d="M 245 0 C 255 140, 225 260, 210 360 C 195 450, 240 510, 260 560"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="3"
                  strokeOpacity="0.35"
                  strokeDasharray="8 8"
                />

                {/* Cairo District Reference Labels */}
                {(Object.keys(CAIRO_AREA_COORDS) as CairoArea[])
                  .filter((a) => a !== 'أخرى')
                  .map((area) => {
                    const pt = projectToSvg(CAIRO_AREA_COORDS[area]);
                    return (
                      <g key={area} className="opacity-45">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="3"
                          fill="#64748B"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 8}
                          textAnchor="middle"
                          fill="#94A3B8"
                          fontSize="12"
                          fontWeight="600"
                        >
                          {area}
                        </text>
                      </g>
                    );
                  })}

                {/* Optimized Route Polyline Connecting Captain -> Stop 1 -> Stop 2 -> ... */}
                {isRouteOptimized && optimizedStops.length > 0 && (
                  <polyline
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                    points={[
                      captainPosition,
                      ...optimizedStops.map((s) => s.position),
                    ]
                      .map((p) => {
                        const xy = projectToSvg(p);
                        return `${xy.x},${xy.y}`;
                      })
                      .join(' ')}
                  />
                )}

                {/* Captain Position Marker */}
                {(() => {
                  const capXY = projectToSvg(captainPosition);
                  return (
                    <g transform={`translate(${capXY.x}, ${capXY.y})`}>
                      <circle
                        r="24"
                        fill="#10B981"
                        fillOpacity="0.2"
                      />
                      <circle
                        r="11"
                        fill="#10B981"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                      />
                      <text
                        y="28"
                        textAnchor="middle"
                        fill="#34D399"
                        fontSize="12"
                        fontWeight="700"
                      >
                        موقع الكابتن ({captainAreaAnchor})
                      </text>
                    </g>
                  );
                })()}

                {/* All Pickup & Delivery Markers */}
                {allPoints.map((pt) => {
                  const xy = projectToSvg(pt.position);
                  const orderIdx = optimizedStops.findIndex(
                    (st) => st.id === pt.id
                  );
                  const isSelected = selectedStop?.id === pt.id;
                  const isPickup = pt.stopType === 'pickup';
                  const isDelivered = pt.shipment.status === 'delivered';
                  const fill = isDelivered
                    ? '#10B981'
                    : isPickup
                    ? '#2563EB'
                    : '#F97316';

                  return (
                    <g
                      key={pt.id}
                      transform={`translate(${xy.x}, ${xy.y})`}
                      onClick={() => setSelectedStopId(pt.id)}
                      className="cursor-pointer"
                    >
                      {isSelected && (
                        <circle
                          r="24"
                          fill={fill}
                          fillOpacity="0.28"
                        />
                      )}
                      <circle
                        r={isSelected ? '15' : '12'}
                        fill={fill}
                        stroke="#FFFFFF"
                        strokeWidth={isSelected ? '3' : '2'}
                      />
                      <text
                        y="4"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="11"
                        fontWeight="700"
                      >
                        {orderIdx >= 0 ? orderIdx + 1 : isPickup ? 'ت' : 'ع'}
                      </text>
                      <rect
                        x="-58"
                        y="-36"
                        width="116"
                        height="18"
                        rx="6"
                        fill="#0F172A"
                        fillOpacity="0.88"
                        stroke={fill}
                        strokeWidth="1"
                      />
                      <text
                        y="-23"
                        textAnchor="middle"
                        fill="#F8FAFC"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {pt.waybillId} · {pt.area}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Bottom Map Overlay Bar */}
              <div className="absolute bottom-3 right-3 left-3 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
                <span>
                  اضغط على أي نقطة استلام (أزرق) أو تسليم (برتقالي) لعرض تفاصيل المحطة وتنفيذ الإجراء
                </span>
                <span className="font-mono-num text-[#F97316] font-bold">
                  إجمالي مسار اليوم النشط: {totalRouteKm} كم (≈ {totalRouteMinutes} دقيقة)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Panel (5 cols on lg:): Selected Stop Inspector + Proximity-Ordered Route Queue */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Stop Action Card */}
          {selectedStop && (
            <div className="rounded-2xl bg-slate-900 text-white p-5 border border-slate-800 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span className="font-mono-num font-bold text-[#F97316]" dir="ltr">
                      {selectedStop.waybillId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {selectedStop.stopType === 'pickup'
                        ? 'نقطة استلام من التاجر'
                        : 'نقطة تسليم للعميل'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{STATUS_META[selectedStop.shipment.status].label}</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-white mt-1">
                    {selectedStop.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {selectedStop.area} — {selectedStop.address}
                  </p>
                </div>

                <div className="bg-slate-800 px-3 py-2 rounded-xl text-center shrink-0">
                  <div className="text-[10px] text-slate-400">المسافة منك</div>
                  <div className="text-sm font-bold font-mono-num text-emerald-400">
                    {selectedStop.distanceFromCaptainKm} كم
                  </div>
                </div>
              </div>

              {/* Quick Actions for Selected Map Point */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <a
                  href={`tel:${selectedStop.phone}`}
                  className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>اتصال</span>
                </a>

                <a
                  href={
                    selectedStop.shipment.googleMapsLink ||
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${selectedStop.address}, ${selectedStop.area}, القاهرة`
                    )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>ملاحة Maps</span>
                </a>

                <a
                  href={`https://wa.me/${formatEgyptWhatsAppNumber(
                    selectedStop.shipment.recipientPhone
                  )}?text=${encodeURIComponent(
                    formatCustomerDeliveryWhatsApp(selectedStop.shipment)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-2.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </a>
              </div>

              {/* 1-Tap Status Advance from Map */}
              {(() => {
                const nextSt = getNextLogicalStatus(
                  selectedStop.shipment.status
                );
                const fin = computeShipmentFinancials(selectedStop.shipment);
                if (!nextSt) return null;
                return (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStatus(selectedStop.waybillId, nextSt)
                    }
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      تحديث الحالة الآن إلى: {STATUS_META[nextSt].label} (المطلوب:{' '}
                      {fin.totalToCollectFromCustomer} ج.م)
                    </span>
                  </button>
                );
              })()}
            </div>
          )}

          {/* Proximity-Sorted Route Stops List */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  ترتيب خط السير المقترح حسب الأقرب ({optimizedStops.length} محطة)
                </h4>
                <p className="text-[11px] text-slate-500">
                  مرتب تلقائياً من موقعك الحالي لتوفير الوقت والوقود
                </p>
              </div>
              <div className="text-left font-mono-num text-xs font-bold text-[#F97316]">
                {totalRouteKm} كم · {totalRouteMinutes} د
              </div>
            </div>

            {optimizedStops.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                جميع الشحنات مكتملة! لا توجد محطات نشطة حالياً على خط السير.
              </div>
            ) : (
              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-0.5">
                {optimizedStops.map((stop, idx) => {
                  const isSelected = selectedStop?.id === stop.id;
                  const isPickup = stop.stopType === 'pickup';
                  const fin = computeShipmentFinancials(stop.shipment);

                  return (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => setSelectedStopId(stop.id)}
                      className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg text-xs font-bold font-mono-num flex items-center justify-center shrink-0 ${
                            isPickup
                              ? 'bg-blue-600 text-white'
                              : 'bg-[#F97316] text-white'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] opacity-80">
                            <span className="font-mono-num font-bold" dir="ltr">
                              {stop.waybillId}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{stop.area}</span>
                          </div>
                          <div className="text-xs sm:text-sm font-bold truncate">
                            {stop.title}
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <div
                          className={`text-xs font-bold font-mono-num ${
                            isSelected ? 'text-[#F97316]' : 'text-slate-900'
                          }`}
                        >
                          +{stop.distanceFromPrevKm} كم
                        </div>
                        <div className="text-[10px] opacity-75 font-mono-num">
                          {isPickup
                            ? 'استلام طرد'
                            : `تحصيل ${fin.totalToCollectFromCustomer} ج`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
