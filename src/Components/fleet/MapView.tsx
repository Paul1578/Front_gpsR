// src/Components/fleet/MapView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "@/Context/AuthContext";
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
  const { apiFetch } = useAuth();

  const [routes, setRoutes] = useState<RouteForMap[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trackingPositions, setTrackingPositions] = useState<LatLngTuple[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, [apiFetch, selectedRouteId]);

  // --------- DERIVADOS PARA UI ---------
  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const stopsCount = useMemo(() => {
    if (!selectedRoute || !Array.isArray(selectedRoute.points)) return 0;
    // el backend incluye origen/destino en points; contamos intermedios
    return Math.max(selectedRoute.points.length - 2, 0);
  }, [selectedRoute]);

  const summary = { routes: routes.length, stopsCount };

  const getStatusMeta = (status?: number) => {
    switch (status) {
      case 1:
        return { label: "En curso", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case 2:
        return { label: "Completada", className: "bg-blue-50 text-blue-700 border-blue-200" };
      case 3:
        return { label: "Cancelada", className: "bg-red-50 text-red-700 border-red-200" };
      default:
        return { label: "Planificada", className: "bg-amber-50 text-amber-700 border-amber-200" };
    }
  };

  const statusMeta = getStatusMeta(selectedRoute?.status);

  // --------- UI ---------
  return (
    <div className="flex flex-col h-full w-full bg-white border border-gray-200 rounded-2xl shadow-sm">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-gradient-to-r from-white to-slate-50">
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
            <div className="absolute z-[400] top-3 left-3 right-3 md:left-4 md:right-auto max-w-sm">
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
                        {selectedRoute.vehicleId.slice(0, 8)}…
                      </span>{" "}
                      · Conductor:{" "}
                      <span className="font-medium">
                        {selectedRoute.driverId.slice(0, 8)}…
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

          <div className="h-[360px] lg:h-full rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
            {isLoading && (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">
                Cargando rutas...
              </div>
            )}
            {!isLoading && error && (
              <div className="flex items-center justify-center h-full text-sm text-red-500">
                {error}
              </div>
            )}
            {!isLoading && !error && (
              <RoutesMapView
                routes={routes}
                selectedRouteId={selectedRouteId}
                onRouteClick={setSelectedRouteId}
                trackingPositions={trackingPositions}
              />
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
                  onClick={() => setSelectedRouteId(route.id)}
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
                          {route.vehicleId.slice(0, 8)}…
                        </span>{" "}
                        · Conductor:{" "}
                        <span className="font-medium">
                          {route.driverId.slice(0, 8)}…
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
