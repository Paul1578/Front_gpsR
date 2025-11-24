// src/Components/fleet/MapView.tsx
"use client";

import { useEffect, useState } from "react";
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

  // tracking de la ruta seleccionada
  const [trackingPositions, setTrackingPositions] = useState<LatLngTuple[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

  // 1) Cargar rutas planificadas del backend
  useEffect(() => {
    if (!apiFetch) return;

    let cancelled = false;

    const loadRoutes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiRoutes = await fetchRoutes(apiFetch); // RouteApiDto[]
        if (cancelled) return;

        const mapped = mapRoutesApiToRoutesForMap(apiRoutes); // RouteForMap[]
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

  // Helper para parsear lat/lng desde RoutePositionDto (que puede venir como number o string)
  const parseCoord = (value?: number | string): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const normalizeTrackingPositions = (positions: RoutePositionDto[]): LatLngTuple[] => {
  // Ordenamos por recordedAt (si no viene, lo dejamos al final)
  const sorted = [...positions].sort((a, b) => {
    const aTime = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
    const bTime = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
    return aTime - bTime;
  });

  return sorted
    .map((p) => {
      // En tu API real vienen como latitude / longitude (number),
      // pero usamos parseCoord por si algún día llegan como string.
      const lat = parseCoord((p as any).latitude);
      const lng = parseCoord((p as any).longitude);

      if (lat == null || lng == null) return null;
      return [lat, lng] as LatLngTuple;
    })
    .filter((v): v is LatLngTuple => v !== null);
};

  // 2) Cargar tracking de la ruta seleccionada
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

  const summary = {
    routes: routes.length,
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-full border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>Volver</span>
            </button>
          )}
          <h1 className="text-lg font-semibold">Mapa de rutas</h1>
        </div>

        <div className="text-right text-xs text-gray-500">
          Rutas cargadas:{" "}
          <span className="font-semibold text-gray-700">{summary.routes}</span>
          <br />
          {selectedRouteId && (
            <span className="inline-flex items-center gap-1 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              {isLoadingTracking
                ? "Cargando tracking..."
                : `Puntos de tracking: ${trackingPositions.length}`}
            </span>
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex flex-1 gap-3 min-h-[400px]">
        {/* Mapa */}
        <div className="flex-1">
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

        {/* Panel lateral con lista de rutas */}
        <aside className="w-72 bg-white border rounded-xl shadow-sm p-3 overflow-auto">
          <h2 className="text-sm font-semibold mb-2">Rutas planificadas</h2>

          {routes.length === 0 && !isLoading && !error && (
            <p className="text-xs text-gray-500">
              No hay rutas registradas aún.
            </p>
          )}

          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;

            return (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedRouteId(route.id)}
                className={`w-full text-left px-2 py-1 rounded mb-1 text-xs transition ${
                  isSelected
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="font-medium truncate">{route.name}</div>
                <div className="text-[10px] text-gray-500">
                  Vehículo: {route.vehicleId.slice(0, 8)}… · Conductor:{" "}
                  {route.driverId.slice(0, 8)}…
                </div>
              </button>
            );
          })}
        </aside>
      </div>
    </div>
  );
}

// También default por si en otro sitio lo quieres importar así
export default MapView;
