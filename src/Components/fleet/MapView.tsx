// src/Components/fleet/MapView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Crosshair,
  LocateFixed,
  Maximize2,
  Minimize2,
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

export function MapView({ onBack }: MapViewProps) {
  const { apiFetch, getAllUsers } = useAuth();
  const { vehicles, drivers } = useFleet();

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
  const [locationError, setLocationError] = useState<string | null>(null);

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

        const filtered = apiRoutes.filter((r) => (r as any).isActive !== false);
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

  // --------- HELPERS PARA TRACKING ---------
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
        const lat = parseCoord((p as any).latitude);
        const lng = parseCoord((p as any).longitude);
        if (lat == null || lng == null) return null;
        return [lat, lng] as LatLngTuple;
      })
      .filter((v): v is LatLngTuple => v !== null);
  };

  const fetchSnappedGeometry = async (
    planned: LatLngTuple[]
  ): Promise<LatLngTuple[] | null> => {
    if (planned.length < 2) return null;

    const coordsParam = planned
      .map(([lat, lng]) => `${lng},${lat}`)
      .join(";");

    const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const data = (await res.json()) as any;
      const geometry = data?.routes?.[0]?.geometry?.coordinates as
        | Array<[number, number]>
        | undefined;

      if (!geometry || geometry.length < 2) return null;
      return geometry.map(([lng, lat]) => [lat, lng] as LatLngTuple);
    } catch {
      return null;
    }
  };

  // --------- CARGA DE TRACKING PARA LA RUTA SELECCIONADA ---------
  useEffect(() => {
    if (!apiFetch || !selectedRouteId) {
      setTrackingPositions([]);
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
  }, [apiFetch, selectedRouteId]);

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
  const loadingBadgeTopClass = selectedRoute ? "top-[124px]" : "top-3";
  const trackingBadgeTopClass = selectedRoute ? "top-[160px]" : "top-12";

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

  useEffect(() => {
    const onFullscreenChange = () => {
      const element = document.fullscreenElement;
      setIsFullscreen(!!element && element.id === "routes-map-card");
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

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
        <div className="relative flex-1">
          {/* Panel flotante con info de la ruta seleccionada */}
          {selectedRoute && (
            <div className="absolute z-[1200] top-3 left-3 right-3 md:left-4 md:right-auto max-w-sm pointer-events-none">
              <div className="rounded-2xl bg-white/90 backdrop-blur border border-gray-100 shadow-sm px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Ruta seleccionada
                    </p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {selectedRoute.name || "Sin nombre"}
                    </p>
                    <p className="text-[11px] text-gray-500">
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
                    className={`ml-2 inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
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
            className="relative z-0 h-[360px] lg:h-full rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white"
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
            />

            <div className="absolute left-3 bottom-14 z-[500] flex flex-col gap-2 items-start">
              <div className="group relative">
                <button
                  type="button"
                  onClick={handleRecenterRoute}
                  disabled={!selectedRouteId}
                  title="Recentrar ruta"
                  aria-label="Recentrar ruta"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RoutePath className="h-4 w-4" />
                </button>
                <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                  Recentrar ruta
                </span>
              </div>

              <div className="group relative">
                <button
                  type="button"
                  onClick={handleFocusTruck}
                  disabled={!selectedRoute}
                  title="Centrar camión"
                  aria-label="Centrar camión"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Truck className="h-4 w-4" />
                </button>
                <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                  Centrar camión
                </span>
              </div>

              <div className="group relative">
                <button
                  type="button"
                  onClick={handleFocusMyLocation}
                  disabled={isLocatingUser}
                  title={isLocatingUser ? "Ubicando..." : "Mi ubicación"}
                  aria-label={isLocatingUser ? "Ubicando..." : "Mi ubicación"}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LocateFixed className="h-4 w-4" />
                </button>
                <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                  {isLocatingUser ? "Ubicando..." : "Mi ubicación"}
                </span>
              </div>

              <div className="group relative">
                <button
                  type="button"
                  onClick={handleToggleFollowTruck}
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
                <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                  {`Seguir camión: ${followTruck ? "ON" : "OFF"}`}
                </span>
              </div>

              <div className="group relative">
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  title={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
                  aria-label={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                  {isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
                </span>
              </div>
            </div>

            {isLoading && (
              <div
                className={`absolute left-3 z-[500] rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] text-blue-700 shadow-sm ${loadingBadgeTopClass}`}
              >
                Actualizando rutas...
              </div>
            )}

            {isLoadingTracking && (
              <div
                className={`absolute left-3 z-[500] rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700 shadow-sm ${trackingBadgeTopClass}`}
              >
                Actualizando tracking...
              </div>
            )}

            {locationError && (
              <div className="absolute left-3 bottom-[256px] z-[500] max-w-xs rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 shadow-sm">
                {locationError}
              </div>
            )}

            {!isLoading && error && routes.length === 0 && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/80 text-sm text-red-500">
                {error}
              </div>
            )}

            {!isLoading && error && routes.length > 0 && (
              <div className="absolute left-3 bottom-3 z-[500] rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] text-red-700 shadow-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR LISTA DE RUTAS */}
        <aside className="w-full lg:w-80 flex-shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm p-3 md:p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-900">
              Rutas planificadas
            </h2>
            <span className="text-[11px] text-gray-400">
              {routes.length} total
            </span>
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
      </div>
    </div>
  );
}

export default MapView;
