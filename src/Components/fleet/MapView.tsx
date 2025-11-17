"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, CircleMarker } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import { toast } from "sonner";
import { ArrowLeft, MapPin, RefreshCw } from "lucide-react";
import { useAuth } from "@/Context/AuthContext";
import { useFleet } from "@/Context/FleetContext";
import {
  fetchRoutePositions,
  fetchRoutes,
  fetchVehicles,
  type RouteDto,
  type RoutePositionDto,
  type VehicleDto,
} from "@/services/fleetApi";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type LatLngTuple = [number, number];

const DEFAULT_CENTER: LatLngTuple = [-0.180653, -78.467834];
const REFRESH_INTERVAL_MS = 15000;

interface MapViewProps {
  onBack?: () => void;
}

interface RouteCardData {
  id: string;
  name: string;
  status: string;
  vehicleId?: string;
  vehicleLabel?: string;
  driverName?: string;
  cargo?: string;
  stopsCount: number;
  description?: string;
}

interface RoutePathData {
  id: string;
  positions: LatLngTuple[];
  lastPosition?: LatLngTuple;
  updatedAt?: string;
}

interface VehicleMarkerData {
  id: string;
  label: string;
  position?: LatLngTuple;
  driverName?: string;
  routeId?: string;
  routeName?: string;
  status?: string;
}

const resolveIconSource = (icon: string | { src: string }) =>
  typeof icon === "string" ? icon : icon.src;

if (typeof window !== "undefined") {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: resolveIconSource(markerIcon2x),
    iconUrl: resolveIconSource(markerIcon),
    shadowUrl: resolveIconSource(markerShadow),
  });
}

const tryParseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const latLngFromValues = (lat?: unknown, lng?: unknown): LatLngTuple | null => {
  const parsedLat = tryParseNumber(lat);
  const parsedLng = tryParseNumber(lng);
  if (parsedLat === null || parsedLng === null) return null;
  return [parsedLat, parsedLng];
};

const getStatusMeta = (status: string) => {
  const key = (status || "").toLowerCase();
  if (key.includes("progress") || key.includes("curso")) {
    return { label: "En curso", className: "bg-green-100 text-green-700" };
  }
  if (key.includes("plan") || key.includes("pend")) {
    return { label: "Planificada", className: "bg-yellow-100 text-yellow-700" };
  }
  if (key.includes("complete") || key.includes("complet")) {
    return { label: "Completada", className: "bg-blue-100 text-blue-700" };
  }
  if (key.includes("cancel")) {
    return { label: "Cancelada", className: "bg-red-100 text-red-700" };
  }
  return { label: status || "Desconocido", className: "bg-gray-100 text-gray-600" };
};

const normalizeRoute = (route: RouteDto, vehiclesMap: Map<string, string>): RouteCardData => {
  const stops = Array.isArray(route.stops)
    ? route.stops
    : Array.isArray(route.puntos)
      ? route.puntos
      : [];
  const vehicleId = route.vehicleId ?? route.vehiculoId ?? undefined;
  return {
    id: route.id,
    name: route.name ?? route.nombre ?? `Ruta ${route.id.substring(0, 6)}`,
    status: route.status ?? route.estado ?? "unknown",
    vehicleId,
    vehicleLabel: vehicleId ? vehiclesMap.get(vehicleId) ?? "Vehículo" : undefined,
    driverName:
      route.driverName ??
      route.driverFullName ??
      route.conductorId ??
      route.driverId ??
      "Sin asignar",
    cargo: route.cargo ?? route.description ?? route.descripcion,
    stopsCount: stops.length,
    description: route.description ?? route.descripcion,
  };
};

const normalizeRoutePath = (routeId: string, positions: RoutePositionDto[]): RoutePathData => {
  const coords: LatLngTuple[] = positions
    .map((pos) => {
      return (
        latLngFromValues(pos.latitude, pos.longitude) ??
        latLngFromValues(pos.latitud, pos.longitud) ??
        latLngFromValues(pos.lat, pos.lng)
      );
    })
    .filter((value): value is LatLngTuple => Boolean(value));

  return {
    id: routeId,
    positions: coords,
    lastPosition: coords[coords.length - 1],
    updatedAt: positions[positions.length - 1]?.recordedAt ?? positions[positions.length - 1]?.timestamp,
  };
};

const normalizeVehicleMarkers = (vehicles: VehicleDto[]): VehicleMarkerData[] => {
  return vehicles.map((vehicle) => {
    const position =
      latLngFromValues(vehicle.lastLatitude, vehicle.lastLongitude) ??
      latLngFromValues(vehicle.latitude, vehicle.longitude);
    const label =
      vehicle.licensePlate ??
      vehicle.plateNumber ??
      vehicle.placa ??
      vehicle.nombre ??
      vehicle.name ??
      `Vehículo ${vehicle.id.substring(0, 4)}`;
    return {
      id: vehicle.id,
      label,
      position: position ?? undefined,
      driverName: vehicle.driverName ?? vehicle.driverFullName,
      status: vehicle.status,
    };
  });
};

export function MapView({ onBack }: MapViewProps = {}) {
  const { apiFetch } = useAuth();
  const { routes: localRoutes, vehicles: localVehicles } = useFleet();
  const [routes, setRoutes] = useState<RouteCardData[]>([]);
  const [routePaths, setRoutePaths] = useState<RoutePathData[]>([]);
  const [vehicleMarkers, setVehicleMarkers] = useState<VehicleMarkerData[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const applyFallbackData = useCallback(() => {
    const vehicleMap = new Map<string, string>();
    const fallbackVehicles: VehicleMarkerData[] = localVehicles.map((vehicle) => {
      if (vehicle.id) vehicleMap.set(vehicle.id, vehicle.placa);
      return {
        id: vehicle.id,
        label: vehicle.placa,
        position: vehicle.ubicacionActual
          ? [vehicle.ubicacionActual.lat, vehicle.ubicacionActual.lng]
          : undefined,
        routeId: localRoutes.find((route) => route.vehiculoId === vehicle.id)?.id,
      };
    });

    const fallbackRoutes: RouteCardData[] = localRoutes.map((route) => ({
      id: route.id,
      name: route.nombre,
      status: route.estado,
      vehicleId: route.vehiculoId,
      vehicleLabel: route.vehiculoId ? vehicleMap.get(route.vehiculoId) : undefined,
      driverName: route.conductorId,
      cargo: route.carga,
      stopsCount: route.puntos?.length ?? 0,
    }));

    const fallbackPaths: RoutePathData[] = localRoutes.map((route) => {
      const pts = route.puntos?.map((stop) => [stop.lat, stop.lng] as LatLngTuple) ?? [];
      return {
        id: route.id,
        positions: pts,
        lastPosition: pts[pts.length - 1],
        updatedAt: route.fechaFin ?? route.fechaInicio ?? route.fechaCreacion,
      };
    });

    setVehicleMarkers(fallbackVehicles);
    setRoutes(fallbackRoutes);
    setRoutePaths(fallbackPaths);
    setSelectedRouteId((prev) => {
      if (prev && fallbackRoutes.some((route) => route.id === prev)) return prev;
      return fallbackRoutes[0]?.id ?? null;
    });
    hasCenteredRef.current = false;
    setError("Mostrando datos locales debido a un problema con el servicio en vivo.");
  }, [localRoutes, localVehicles]);

  const loadData = useCallback(async () => {
    if (!apiFetch) return;
    setIsRefreshing(true);
    setError(null);

    try {
      const [routesResponse, vehiclesResponse] = await Promise.all([
        fetchRoutes(apiFetch, { status: "InProgress" }),
        fetchVehicles(apiFetch),
      ]);

      const vehicleBasics = normalizeVehicleMarkers(vehiclesResponse);
      const vehiclesMap = new Map(vehicleBasics.map((vehicle) => [vehicle.id, vehicle.label]));

      const normalizedRoutes = routesResponse.map((route) => normalizeRoute(route, vehiclesMap));
      const enrichedVehicles = vehicleBasics.map((vehicle) => {
        const linkedRoute = normalizedRoutes.find((route) => route.vehicleId === vehicle.id);
        return {
          ...vehicle,
          routeId: linkedRoute?.id,
          routeName: linkedRoute?.name,
        };
      });

      const positionsResults = await Promise.all(
        normalizedRoutes.map(async (route) => {
          try {
            const positions = await fetchRoutePositions(apiFetch, route.id);
            return normalizeRoutePath(route.id, positions);
          } catch (err) {
            console.error(`Error al obtener posiciones de la ruta ${route.id}`, err);
            return normalizeRoutePath(route.id, []);
          }
        })
      );

      setRoutes(normalizedRoutes);
      setVehicleMarkers(enrichedVehicles);
      setRoutePaths(positionsResults);
      setSelectedRouteId((prev) => {
        if (prev && normalizedRoutes.some((route) => route.id === prev)) return prev;
        return normalizedRoutes[0]?.id ?? null;
      });
      hasCenteredRef.current = false;
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error cargando datos del mapa en tiempo real:", err);
      toast.error("No se pudo cargar el mapa en tiempo real. Mostrando datos locales.");
      applyFallbackData();
    } finally {
      setIsRefreshing(false);
    }
  }, [apiFetch, applyFallbackData]);

  useEffect(() => {
    if (!isClient) return;
    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isClient, loadData]);

  useEffect(() => {
    if (!selectedRouteId && routes.length) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (hasCenteredRef.current) return;
    const firstRouteWithPosition = routePaths.find((route) => route.lastPosition);
    if (firstRouteWithPosition?.lastPosition) {
      mapInstanceRef.current.setView(firstRouteWithPosition.lastPosition as LatLngExpression, 12);
      hasCenteredRef.current = true;
    }
  }, [routePaths]);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedRouteId) return;
    const selectedPath = routePaths.find((path) => path.id === selectedRouteId);
    if (selectedPath?.positions.length) {
      const bounds = L.latLngBounds(selectedPath.positions as LatLngExpression[]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [routePaths, selectedRouteId]);

  const mapCenter = useMemo<LatLngExpression>(() => {
    const selectedPath = routePaths.find((path) => path.id === selectedRouteId);
    if (selectedPath?.lastPosition) return selectedPath.lastPosition;
    const fallbackRoute = routePaths.find((path) => path.lastPosition);
    if (fallbackRoute?.lastPosition) return fallbackRoute.lastPosition;
    const vehicleWithCoords = vehicleMarkers.find((vehicle) => vehicle.position);
    if (vehicleWithCoords?.position) return vehicleWithCoords.position;
    return DEFAULT_CENTER;
  }, [routePaths, vehicleMarkers, selectedRouteId]);

  const summary = useMemo(() => {
    const activeRoutes = routes.length;
    const trackedVehicles = vehicleMarkers.filter((vehicle) => vehicle.position).length;
    return {
      routes: activeRoutes,
      vehicles: trackedVehicles,
    };
  }, [routes, vehicleMarkers]);

  const formattedUpdated =
    lastUpdated &&
    lastUpdated.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-xl md:text-2xl text-gray-900">Mapa en Tiempo Real</h2>
              <p className="text-sm text-gray-500 mt-1">
                Visualiza tus rutas activas y el posicionamiento más reciente
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => void loadData()}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm disabled:opacity-60"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Actualizando..." : "Actualizar"}
            </button>
            <p className="text-xs text-gray-500">
              Última actualización: {formattedUpdated ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 relative bg-gray-100">
          {isClient ? (
            <MapContainer
              center={mapCenter}
              zoom={12}
              className="h-[420px] lg:h-full w-full"
              whenCreated={(map) => {
                mapInstanceRef.current = map;
              }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />

              {routePaths.map((route) =>
                route.positions.length ? (
                  <Polyline
                    key={route.id}
                    positions={route.positions}
                    pathOptions={{
                      color: route.id === selectedRouteId ? "#3271a4" : "#94a3b8",
                      weight: route.id === selectedRouteId ? 5 : 3,
                      opacity: route.id === selectedRouteId ? 0.85 : 0.45,
                    }}
                  />
                ) : null
              )}

              {routePaths.map((route) =>
                route.lastPosition ? (
                  <Marker key={`${route.id}-marker`} position={route.lastPosition}>
                    <Popup>
                      <p className="font-semibold mb-1">
                        {routes.find((item) => item.id === route.id)?.name ?? "Ruta"}
                      </p>
                      <p className="text-xs text-gray-600">
                        Actualizado:{" "}
                        {route.updatedAt
                          ? new Date(route.updatedAt).toLocaleTimeString("es-ES")
                          : "—"}
                      </p>
                    </Popup>
                  </Marker>
                ) : null
              )}

              {vehicleMarkers.map((vehicle) =>
                vehicle.position ? (
                  <CircleMarker
                    key={vehicle.id}
                    center={vehicle.position}
                    radius={6}
                    pathOptions={{
                      color: vehicle.routeId === selectedRouteId ? "#2563eb" : "#1d4ed8",
                      fillColor: "#1d4ed8",
                      fillOpacity: 0.7,
                    }}
                  >
                    <Popup>
                      <p className="font-semibold mb-1">{vehicle.label}</p>
                      {vehicle.driverName && (
                        <p className="text-xs text-gray-600">Conductor: {vehicle.driverName}</p>
                      )}
                      {vehicle.routeName && (
                        <p className="text-xs text-gray-600">Ruta: {vehicle.routeName}</p>
                      )}
                    </Popup>
                  </CircleMarker>
                ) : null
              )}
            </MapContainer>
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center text-gray-500">
              Inicializando mapa...
            </div>
          )}

          {error && (
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow">
              {error}
            </div>
          )}
        </div>

        <aside className="w-full lg:w-80 border-t lg:border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-50 px-3 py-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Rutas</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.routes}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Vehículos</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.vehicles}</p>
              </div>
            </div>

            <div>
              <h3 className="text-base text-gray-900 mb-3">Rutas activas</h3>
              {routes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin size={36} className="mx-auto mb-2 text-gray-300" />
                  No hay rutas activas por ahora.
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((route) => {
                    const statusMeta = getStatusMeta(route.status);
                    const isSelected = route.id === selectedRouteId;
                    return (
                      <button
                        key={route.id}
                        onClick={() => setSelectedRouteId(route.id)}
                        className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                          isSelected
                            ? "border-[#3271a4] bg-blue-50"
                            : "border-gray-200 hover:border-[#3271a4]/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{route.name}</p>
                            <p className="text-xs text-gray-500">
                              {route.vehicleLabel ?? "Vehículo no asignado"}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                          <span>Paradas: {route.stopsCount}</span>
                          <span>Carga: {route.cargo ?? "N/A"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
