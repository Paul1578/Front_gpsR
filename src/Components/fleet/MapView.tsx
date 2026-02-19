// src/Components/fleet/MapView.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Layers,
  LocateFixed,
  Maximize2,
  Minimize2,
  RefreshCw,
  Route as RoutePath,
  Truck,
} from "lucide-react";

import { useAuth } from "@/Context/AuthContext";
import { useFleet } from "@/Context/FleetContext";
import {
  fetchRoutes,
  fetchRoutePositions,
  mapRoutesApiToRoutesForMap,
  type RouteForMap,
  type RoutePositionDto,
} from "@/services/fleetApi";
import RoutesMapView from "./RoutesMapView";

export interface MapViewProps {
  onBack?: () => void;
}

type LatLngTuple = [number, number];
type OsrmRouteResponse = {
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};
type TrackingPositionSource = Partial<Pick<RoutePositionDto, "recordedAt">> & {
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
};
type PersistedMapOptions = {
  showOnlySelectedRoute: boolean;
  showStops: boolean;
  showPlannedLine: boolean;
  showTrackingLine: boolean;
  showRoutesPanel: boolean;
};

const MAP_OPTIONS_STORAGE_KEY = "fleetflow:web:map-view-options";
const DEFAULT_MAP_OPTIONS: PersistedMapOptions = {
  showOnlySelectedRoute: false,
  showStops: true,
  showPlannedLine: true,
  showTrackingLine: true,
  showRoutesPanel: true,
};

const readPersistedMapOptions = (): PersistedMapOptions => {
  if (typeof window === "undefined") return DEFAULT_MAP_OPTIONS;
  try {
    const raw = window.localStorage.getItem(MAP_OPTIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_MAP_OPTIONS;
    const parsed = JSON.parse(raw) as Partial<PersistedMapOptions>;
    return {
      showOnlySelectedRoute:
        typeof parsed.showOnlySelectedRoute === "boolean"
          ? parsed.showOnlySelectedRoute
          : DEFAULT_MAP_OPTIONS.showOnlySelectedRoute,
      showStops:
        typeof parsed.showStops === "boolean"
          ? parsed.showStops
          : DEFAULT_MAP_OPTIONS.showStops,
      showPlannedLine:
        typeof parsed.showPlannedLine === "boolean"
          ? parsed.showPlannedLine
          : DEFAULT_MAP_OPTIONS.showPlannedLine,
      showTrackingLine:
        typeof parsed.showTrackingLine === "boolean"
          ? parsed.showTrackingLine
          : DEFAULT_MAP_OPTIONS.showTrackingLine,
      showRoutesPanel:
        typeof parsed.showRoutesPanel === "boolean"
          ? parsed.showRoutesPanel
          : DEFAULT_MAP_OPTIONS.showRoutesPanel,
    };
  } catch {
    return DEFAULT_MAP_OPTIONS;
  }
};

const parseCoord = (value?: number | string): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeTrackingPositions = (positions: RoutePositionDto[]): LatLngTuple[] => {
  const sorted = [...positions].sort((a, b) => {
    const aTime = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
    const bTime = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
    return aTime - bTime;
  });

  return sorted
    .map((p) => {
      const candidate = p as TrackingPositionSource;
      const lat = parseCoord(candidate.latitude ?? candidate.lat);
      const lng = parseCoord(candidate.longitude ?? candidate.lng);
      if (lat == null || lng == null) return null;
      return [lat, lng] as LatLngTuple;
    })
    .filter((v): v is LatLngTuple => v !== null);
};

const fetchSnappedGeometry = async (
  planned: LatLngTuple[]
): Promise<LatLngTuple[] | null> => {
  if (planned.length < 2) return null;

  const coordsParam = planned.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = (await res.json()) as OsrmRouteResponse;
    const geometry = data.routes?.[0]?.geometry?.coordinates;
    if (!geometry || geometry.length < 2) return null;
    return geometry.map(([lng, lat]) => [lat, lng] as LatLngTuple);
  } catch {
    return null;
  }
};

export function MapView({ onBack }: MapViewProps) {
  const { apiFetch, getAllUsers } = useAuth();
  const { vehicles, drivers } = useFleet();
  const initialMapOptions = useMemo(readPersistedMapOptions, []);

  const [routes, setRoutes] = useState<RouteForMap[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trackingPositions, setTrackingPositions] = useState<LatLngTuple[]>([]);
  const [trackingDisplay, setTrackingDisplay] = useState<LatLngTuple[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLngTuple | null>(null);
  const [focusUserSignal, setFocusUserSignal] = useState(0);
  const [focusTrackingSignal, setFocusTrackingSignal] = useState(0);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [followTruck, setFollowTruck] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeControlHint, setActiveControlHint] = useState<string | null>(null);
  const [showOnlySelectedRoute, setShowOnlySelectedRoute] = useState(
    initialMapOptions.showOnlySelectedRoute
  );
  const [showStops, setShowStops] = useState(initialMapOptions.showStops);
  const [showPlannedLine, setShowPlannedLine] = useState(
    initialMapOptions.showPlannedLine
  );
  const [showTrackingLine, setShowTrackingLine] = useState(
    initialMapOptions.showTrackingLine
  );
  const [showRoutesPanel, setShowRoutesPanel] = useState(
    initialMapOptions.showRoutesPanel
  );
  const [canCollapseRoutesPanel, setCanCollapseRoutesPanel] = useState(false);
  const [showMapOptions, setShowMapOptions] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [resizeSignal, setResizeSignal] = useState(0);
  const [trackingRefreshSignal, setTrackingRefreshSignal] = useState(0);
  const [lastTrackingSyncAt, setLastTrackingSyncAt] = useState<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --------- CARGA DE RUTAS PLANIFICADAS ---------
  useEffect(() => {
    if (!apiFetch) return;
    let cancelled = false;

    const loadRoutes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiRoutes = await fetchRoutes(apiFetch);
        if (cancelled) return;

        const filtered = apiRoutes.filter((r) => r.isActive !== false);
        const mapped = mapRoutesApiToRoutesForMap(filtered);
        setRoutes(mapped);

        setSelectedRouteId((prev) => {
          if (prev && mapped.some((r) => r.id === prev)) return prev;
          return mapped[0]?.id ?? null;
        });
      } catch (err) {
        console.error("Error cargando rutas para el mapa", err);
        if (!cancelled) setError("No se pudieron cargar las rutas");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadRoutes();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  // --------- CARGA DE TRACKING PARA LA RUTA SELECCIONADA ---------
  useEffect(() => {
    if (!apiFetch || !selectedRouteId) {
      setTrackingPositions([]);
      setLastTrackingSyncAt(null);
      return;
    }
    let cancelled = false;

    const loadTracking = async () => {
      try {
        setIsLoadingTracking(true);
        const apiPositions = await fetchRoutePositions(apiFetch, selectedRouteId);
        if (cancelled) return;
        const coords = normalizeTrackingPositions(apiPositions);
        setTrackingPositions(coords);
        setLastTrackingSyncAt(Date.now());
      } catch (err) {
        console.error("Error cargando tracking de la ruta", err);
        if (!cancelled) setTrackingPositions([]);
      } finally {
        if (!cancelled) setIsLoadingTracking(false);
      }
    };

    void loadTracking();
    const intervalId = setInterval(loadTracking, 20000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [apiFetch, selectedRouteId, trackingRefreshSignal]);

  useEffect(() => {
    let cancelled = false;
    if (trackingPositions.length < 2) {
      setTrackingDisplay(trackingPositions);
      return;
    }
    const tail = trackingPositions.slice(-8);
    const snap = async () => {
      const snapped = await fetchSnappedGeometry(tail);
      if (!cancelled) {
        setTrackingDisplay(snapped ?? tail);
      }
    };
    void snap();
    return () => {
      cancelled = true;
    };
  }, [trackingPositions]);

  // --------- DERIVADOS PARA UI ---------
  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );
  const trackingLatest = useMemo(
    () => (trackingDisplay.length ? trackingDisplay[trackingDisplay.length - 1] : null),
    [trackingDisplay]
  );

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );
  const driverById = useMemo(
    () => new Map(drivers.map((driver) => [driver.id, driver])),
    [drivers]
  );
  const users = getAllUsers();

  const formatVehicleLabel = (vehicleId?: string) => {
    if (!vehicleId) return "Vehículo no asignado";
    const vehicle = vehicleById.get(vehicleId);
    if (!vehicle) return "Vehículo no disponible";
    const name = [vehicle.modelo, vehicle.marca].filter(Boolean).join(" ").trim();
    if (name && vehicle.placa) return `${name} (${vehicle.placa})`;
    return name || vehicle.placa || "Vehículo no disponible";
  };

  const formatDriverLabel = (driverId?: string) => {
    if (!driverId) return "Conductor no asignado";
    const driver = driverById.get(driverId);
    if (driver) {
      const fullName = [driver.firstName, driver.lastName].filter(Boolean).join(" ").trim();
      if (fullName) return fullName;
    }
    const user = users.find((item) => item.driverId === driverId || item.id === driverId);
    if (user) {
      const fullName = [user.nombres, user.apellidos].filter(Boolean).join(" ").trim();
      return fullName || user.usuario || "Conductor no disponible";
    }
    return "Conductor no disponible";
  };

  const stopsCount = useMemo(() => {
    if (!selectedRoute || !Array.isArray(selectedRoute.points)) return 0;
    // el backend incluye origen/destino en points; contamos intermedios
    return Math.max(selectedRoute.points.length - 2, 0);
  }, [selectedRoute]);

  const summary = { routes: routes.length, stopsCount };
  const isRoutesPanelVisible = !canCollapseRoutesPanel || showRoutesPanel;

  const getStatusMeta = (status?: number) => {
    switch (status) {
      case 1:
        return { label: "En curso", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-900/50" };
      case 2:
        return { label: "Completada", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-900/50" };
      case 3:
        return { label: "Cancelada", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-900/50" };
      default:
        return { label: "Planificada", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-900/50" };
    }
  };

  const statusMeta = getStatusMeta(selectedRoute?.status);
  const optionsPanelMobileTopClass = selectedRoute ? "top-[9.75rem]" : "top-3";
  const selectedRouteCardTopClass =
    canCollapseRoutesPanel && !isRoutesPanelVisible ? "top-12" : "top-3";

  const handleRecenterRoute = () => {
    if (!selectedRouteId) return;
    setFitSignal((prev) => prev + 1);
  };

  const handleFocusMyLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Geolocalización no disponible en este navegador.");
      return;
    }

    setIsLocatingUser(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setFocusUserSignal((prev) => prev + 1);
        setIsLocatingUser(false);
      },
      () => {
        setLocationError("No se pudo obtener tu ubicación.");
        setIsLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const handleFocusTruck = () => {
    if (!selectedRoute) return;
    setFocusTrackingSignal((prev) => prev + 1);
  };

  const handleToggleFollowTruck = () => {
    setFollowTruck((prev) => !prev);
  };

  const handleRefreshTrackingNow = () => {
    if (!selectedRouteId || isLoadingTracking) return;
    setTrackingRefreshSignal((prev) => prev + 1);
  };

  const handleToggleFullscreen = async () => {
    const mapCard = document.getElementById("routes-map-card");
    if (!mapCard) return;

    try {
      if (!document.fullscreenElement) {
        await mapCard.requestFullscreen();
        return;
      }
      await document.exitFullscreen();
    } catch {
      // no-op
    }
  };

  const startLongPressHint = (hint: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      setActiveControlHint(hint);
    }, 450);
  };

  const clearLongPressHint = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setActiveControlHint(null);
  };

  const bumpResizeSignal = useCallback(() => {
    setResizeSignal((prev) => prev + 1);
  }, []);

  const lastTrackingSyncLabel = useMemo(() => {
    if (!lastTrackingSyncAt) return null;
    return new Date(lastTrackingSyncAt).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastTrackingSyncAt]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const element = document.fullscreenElement;
      setIsFullscreen(!!element && element.id === "routes-map-card");
      bumpResizeSignal();
      setTimeout(() => bumpResizeSignal(), 220);
    };
    const onWindowResize = () => {
      bumpResizeSignal();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("resize", onWindowResize);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("resize", onWindowResize);
    };
  }, [bumpResizeSignal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const syncCollapseCapability = () => {
      setCanCollapseRoutesPanel(media.matches);
    };
    syncCollapseCapability();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", syncCollapseCapability);
      return () => {
        media.removeEventListener("change", syncCollapseCapability);
      };
    }

    media.addListener(syncCollapseCapability);
    return () => {
      media.removeListener(syncCollapseCapability);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedMapOptions = {
      showOnlySelectedRoute,
      showStops,
      showPlannedLine,
      showTrackingLine,
      showRoutesPanel,
    };
    window.localStorage.setItem(MAP_OPTIONS_STORAGE_KEY, JSON.stringify(payload));
  }, [
    showOnlySelectedRoute,
    showStops,
    showPlannedLine,
    showTrackingLine,
    showRoutesPanel,
  ]);

  // --------- UI ---------
  return (
    <div className="flex flex-col h-full w-full bg-white border border-gray-200 rounded-2xl shadow-sm">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </button>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
              Seguimiento
            </p>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              Mapa de rutas
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs text-blue-700 border border-blue-100">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold shadow-sm">
              {summary.routes}
            </span>
            <span className="font-medium">rutas</span>
          </div>

          {selectedRouteId && (
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 border border-emerald-100">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              {`Puntos: ${summary.stopsCount}`}
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 md:p-5 min-h-[440px] bg-slate-50">
        {/* MAPA */}
        <div className="relative flex-1 flex flex-col gap-2">
          {canCollapseRoutesPanel && !isRoutesPanelVisible && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowRoutesPanel(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100"
                title="Mostrar rutas planificadas"
                aria-label="Mostrar rutas planificadas"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Panel flotante con info de la ruta seleccionada */}
          {selectedRoute && (
            <div
              className={`absolute z-[1080] ${selectedRouteCardTopClass} left-3 right-3 md:left-4 md:right-auto md:max-w-sm pointer-events-none`}
            >
              <div className="w-full rounded-2xl bg-white/90 backdrop-blur border border-gray-100 shadow-sm px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Ruta seleccionada
                    </p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {selectedRoute.name || "Sin nombre"}
                    </p>
                    <p className="hidden sm:block text-[11px] leading-4 text-gray-500 break-words">
                      Vehículo:{" "}
                      <span className="font-medium">
                        {formatVehicleLabel(selectedRoute.vehicleId)}
                      </span>{" "}
                      · Conductor:{" "}
                      <span className="font-medium">
                        {formatDriverLabel(selectedRoute.driverId)}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`ml-1 mt-0.5 inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <div className="mt-2 hidden sm:flex items-center gap-3 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-1.5 rounded-full bg-blue-500" />
                    <span>Planificada</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-1.5 rounded-full bg-emerald-500" />
                    <span>Tracking real</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div
            id="routes-map-card"
            className="relative z-0 h-[320px] sm:h-[360px] lg:h-full rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white"
          >
            <RoutesMapView
              routes={routes}
              selectedRouteId={selectedRouteId}
              onRouteClick={(routeId) => {
                setSelectedRouteId(routeId);
                setFitSignal((prev) => prev + 1);
              }}
              fitSignal={fitSignal}
              trackingPositions={trackingDisplay}
              userLocation={userLocation}
              focusUserSignal={focusUserSignal}
              focusTrackingSignal={focusTrackingSignal}
              followTracking={followTruck}
              showOnlySelectedRoute={showOnlySelectedRoute}
              showStops={showStops}
              showPlannedLine={showPlannedLine}
              showTrackingLine={showTrackingLine}
              resizeSignal={resizeSignal}
            />

            <div className="absolute left-3 bottom-8 z-[1100]">
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-2">
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={handleToggleFollowTruck}
                      onTouchStart={() => startLongPressHint("follow")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      disabled={!trackingLatest}
                      title={`Seguir camión: ${followTruck ? "ON" : "OFF"}`}
                      aria-label={`Seguir camión: ${followTruck ? "ON" : "OFF"}`}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm backdrop-blur transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        followTruck
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-white/95 text-gray-700 hover:bg-white"
                      }`}
                    >
                      <Crosshair className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "follow" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {`Seguir camión: ${followTruck ? "ON" : "OFF"}`}
                    </span>
                  </div>

                  <div className="group relative">
                    <button
                      type="button"
                      onClick={handleToggleFullscreen}
                      onTouchStart={() => startLongPressHint("fullscreen")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      title={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
                      aria-label={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={`pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "fullscreen" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
                    </span>
                  </div>

                  <div className="group relative z-[1140]">
                    <button
                      type="button"
                      onClick={() => setShowMapOptions((prev) => !prev)}
                      onTouchStart={() => startLongPressHint("options")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      title={`Opciones del mapa: ${showMapOptions ? "ON" : "OFF"}`}
                      aria-label={`Opciones del mapa: ${showMapOptions ? "ON" : "OFF"}`}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm backdrop-blur transition ${
                        showMapOptions
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white/95 text-gray-700 hover:bg-white"
                      }`}
                    >
                      <Layers className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "options" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      Opciones del mapa
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={handleRecenterRoute}
                      onTouchStart={() => startLongPressHint("recenter")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      disabled={!selectedRouteId}
                      title="Recentrar ruta"
                      aria-label="Recentrar ruta"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RoutePath className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "recenter" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      Recentrar ruta
                    </span>
                  </div>

                  <div className="group relative">
                    <button
                      type="button"
                      onClick={handleFocusTruck}
                      onTouchStart={() => startLongPressHint("truck")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      disabled={!selectedRoute}
                      title="Centrar camión"
                      aria-label="Centrar camión"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Truck className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "truck" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      Centrar camión
                    </span>
                  </div>

                  <div className="group relative">
                    <button
                      type="button"
                      onClick={handleFocusMyLocation}
                      onTouchStart={() => startLongPressHint("location")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      disabled={isLocatingUser}
                      title={isLocatingUser ? "Ubicando..." : "Mi ubicación"}
                      aria-label={isLocatingUser ? "Ubicando..." : "Mi ubicación"}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LocateFixed className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "location" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {isLocatingUser ? "Ubicando..." : "Mi ubicación"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {showMapOptions && (
              <div
                className={`absolute left-16 right-3 ${optionsPanelMobileTopClass} bottom-16 z-[1120] overflow-y-auto rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:left-16 sm:right-auto sm:top-auto sm:bottom-8 sm:max-h-[70vh] sm:w-64`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Opciones
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMapOptions(false)}
                    className="rounded-md px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700">Solo ruta seleccionada</span>
                    <button
                      type="button"
                      onClick={() => setShowOnlySelectedRoute((prev) => !prev)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        showOnlySelectedRoute
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      {showOnlySelectedRoute ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700">Mostrar paradas</span>
                    <button
                      type="button"
                      onClick={() => setShowStops((prev) => !prev)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        showStops
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      {showStops ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700">Ruta planificada</span>
                    <button
                      type="button"
                      onClick={() => setShowPlannedLine((prev) => !prev)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        showPlannedLine
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      {showPlannedLine ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700">Tracking real</span>
                    <button
                      type="button"
                      onClick={() => setShowTrackingLine((prev) => !prev)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        showTrackingLine
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      {showTrackingLine ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshTrackingNow}
                  disabled={!selectedRouteId || isLoadingTracking}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTracking ? "animate-spin" : ""}`} />
                  {isLoadingTracking ? "Actualizando..." : "Actualizar tracking ahora"}
                </button>

                {lastTrackingSyncLabel && (
                  <p className="mt-2 text-[11px] text-gray-500">
                    Última actualización: {lastTrackingSyncLabel}
                  </p>
                )}
              </div>
            )}

            {isLoading && (
              <div className="absolute right-3 top-3 z-[1040] rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] text-blue-700 shadow-sm">
                Actualizando rutas...
              </div>
            )}

            {isLoadingTracking && (
              <div className="absolute right-3 top-12 z-[1040] rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700 shadow-sm">
                Actualizando tracking...
              </div>
            )}

            {locationError && (
              <div className="absolute left-3 bottom-[256px] z-[1060] max-w-xs rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 shadow-sm">
                {locationError}
              </div>
            )}

            {!isLoading && error && routes.length === 0 && (
              <div className="absolute inset-0 z-[1060] flex items-center justify-center bg-white/80 text-sm text-red-500">
                {error}
              </div>
            )}

            {!isLoading && error && routes.length > 0 && (
              <div className="absolute left-3 bottom-3 z-[1060] rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] text-red-700 shadow-sm">
                {error}
              </div>
            )}

          </div>
        </div>

        {/* SIDEBAR LISTA DE RUTAS */}
        {isRoutesPanelVisible && (
          <aside className="w-full lg:w-80 flex-shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm p-3 md:p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">
                  Rutas planificadas
                </h2>
                <span className="text-[11px] text-gray-400">
                  {routes.length} total
                </span>
              </div>
              {canCollapseRoutesPanel && (
                <button
                  type="button"
                  onClick={() => setShowRoutesPanel(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                  title="Ocultar rutas planificadas"
                  aria-label="Ocultar rutas planificadas"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {routes.length === 0 && !isLoading && !error && (
              <p className="text-xs text-gray-500">
                No hay rutas registradas aún.
              </p>
            )}

            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {routes.map((route) => {
                const isSelected = route.id === selectedRouteId;
                const meta = getStatusMeta(route.status);

                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => {
                      setSelectedRouteId(route.id);
                      setFitSignal((prev) => prev + 1);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition text-xs md:text-sm ${
                      isSelected
                        ? "border-blue-300 bg-blue-50 text-blue-900 shadow-xs"
                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/70 text-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {route.name || "Ruta sin nombre"}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          Vehículo:{" "}
                          <span className="font-medium">
                            {formatVehicleLabel(route.vehicleId)}
                          </span>{" "}
                          · Conductor:{" "}
                          <span className="font-medium">
                            {formatDriverLabel(route.driverId)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default MapView;
