// src/Components/fleet/RoutesMapView.tsx
"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { RouteForMap } from "@/services/fleetApi";

// Iconos de Leaflet como StaticImageData (Next)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { StaticImageData } from "next/image";

// Helper: siempre devolver string
const toIconUrl = (img: string | StaticImageData): string =>
  typeof img === "string" ? img : img.src;

const markerIcon2xUrl = toIconUrl(markerIcon2x);
const markerIconUrl = toIconUrl(markerIcon);
const markerShadowUrl = toIconUrl(markerShadow);

// Fijar iconos por defecto de Leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
});

type LatLngTuple = [number, number];

interface RoutesMapViewProps {
  routes: RouteForMap[];
  selectedRouteId?: string | null;
  onRouteClick?: (routeId: string) => void;
  initialCenter?: LatLngExpression;
  initialZoom?: number;
  /** Tracking de la ruta seleccionada (si existe) */
  trackingPositions?: LatLngTuple[];
}

const DEFAULT_CENTER: LatLngTuple = [-0.180653, -78.467834]; // Quito aprox
const DEFAULT_ZOOM = 7;

/**
 * Construye la polyline planificada:
 * origen -> puntos intermedios -> destino
 */
function buildRoutePolyline(route: RouteForMap): LatLngTuple[] {
  const result: LatLngTuple[] = [];

  const pushUnique = (lat: number, lng: number) => {
    const last = result[result.length - 1];
    if (!last || last[0] !== lat || last[1] !== lng) {
      result.push([lat, lng]);
    }
  };

  if (route.origin) {
    pushUnique(route.origin.latitude, route.origin.longitude);
  }

  if (Array.isArray(route.points)) {
    for (const p of route.points) {
      pushUnique(p.latitude, p.longitude);
    }
  }

  if (route.destination) {
    pushUnique(route.destination.latitude, route.destination.longitude);
  }

  return result;
}

/**
 * Llama a OSRM para obtener la geometría por carretera.
 */
async function fetchSnappedGeometry(
  planned: LatLngTuple[]
): Promise<LatLngTuple[] | null> {
  if (planned.length < 2) return null;

  const coordsParam = planned
    .map(([lat, lng]) => `${lng},${lat}`) // OSRM usa lon,lat
    .join(";");

  const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = (await res.json()) as any;
    const geometry = data?.routes?.[0]?.geometry?.coordinates as
      | Array<[number, number]>
      | undefined;

    if (!geometry || geometry.length < 2) {
      throw new Error("OSRM sin geometría");
    }

    // OSRM devuelve [lon, lat] → convertimos a [lat, lng]
    return geometry.map(([lng, lat]) => [lat, lng] as LatLngTuple);
  } catch (err) {
    console.warn("OSRM falló, usando línea recta:", err);
    return null;
  }
}

/**
 * Colores por estado de ruta (ajusta al enum real si quieres).
 */
function getRouteColor(status: number): string {
  switch (status) {
    case 1: // InProgress
      return "#2563eb";
    case 2: // Completed
      return "#16a34a";
    case 3: // Cancelled
      return "#6b7280";
    default: // Pending u otros
      return "#f97316";
  }
}

export function RoutesMapView({
  routes,
  selectedRouteId = null,
  onRouteClick,
  initialCenter,
  initialZoom = DEFAULT_ZOOM,
  trackingPositions,
}: RoutesMapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);

  const [snappedByRoute, setSnappedByRoute] = useState<
    Record<string, LatLngTuple[]>
  >({});

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const mapInitialCenter: LatLngExpression = useMemo(() => {
    if (initialCenter) return initialCenter;

    if (routes.length > 0 && routes[0].origin) {
      return [
        routes[0].origin.latitude,
        routes[0].origin.longitude,
      ] as LatLngTuple;
    }

    return DEFAULT_CENTER;
  }, [routes, initialCenter]);

  /**
   * Cargar geometría OSRM para cada ruta que aún no tenga snapping.
   */
  useEffect(() => {
    let cancelled = false;

    const routesToSnap = routes.filter((route) => {
      const planned = buildRoutePolyline(route);
      return planned.length >= 2 && !snappedByRoute[route.id];
    });

    if (routesToSnap.length === 0) return;

    const load = async () => {
      for (const route of routesToSnap) {
        const planned = buildRoutePolyline(route);
        const snapped = await fetchSnappedGeometry(planned);
        if (!cancelled && snapped && snapped.length >= 2) {
          setSnappedByRoute((prev) => ({
            ...prev,
            [route.id]: snapped,
          }));
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [routes, snappedByRoute]);

  // Ajustar zoom a la ruta seleccionada (incluyendo tracking si existe)
  useEffect(() => {
    if (!selectedRoute || !mapRef.current) return;

    const snapped = snappedByRoute[selectedRoute.id];
    const fallbackPlanned = buildRoutePolyline(selectedRoute);
    let boundsCoords: LatLngTuple[] =
      snapped && snapped.length >= 2 ? [...snapped] : [...fallbackPlanned];

    if (trackingPositions && trackingPositions.length >= 2) {
      boundsCoords = boundsCoords.concat(trackingPositions);
    }

    if (boundsCoords.length === 0) return;

    const bounds = L.latLngBounds(
      boundsCoords.map(([lat, lng]) => L.latLng(lat, lng))
    );

    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  }, [selectedRoute, snappedByRoute, trackingPositions]);

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden shadow-md bg-white">
      <MapContainer
        center={mapInitialCenter}
        zoom={initialZoom}
        scrollWheelZoom
        className="w-full h-full"
        whenCreated={(mapInstance: LeafletMap) => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routes.map((route) => {
          const planned = buildRoutePolyline(route);
          const snapped = snappedByRoute[route.id];
          const polyline =
            snapped && snapped.length >= 2 ? snapped : planned;

          if (polyline.length === 0) return null;

          const isSelected = route.id === selectedRouteId;
          const color = getRouteColor(route.status);

          const origin: LatLngTuple = [
            route.origin.latitude,
            route.origin.longitude,
          ];

          const destination: LatLngTuple = [
            route.destination.latitude,
            route.destination.longitude,
          ];

          return (
            <Fragment key={route.id}>
              {/* Línea planificada (snapeada a carretera si OSRM respondió) */}
              <Polyline
                positions={polyline}
                pathOptions={{
                  color,
                  weight: isSelected ? 6 : 4,
                  opacity: isSelected ? 0.9 : 0.7,
                }}
                eventHandlers={{
                  click: () => onRouteClick?.(route.id),
                }}
              />

              {/* Tracking solo para la ruta seleccionada */}
              {isSelected &&
                trackingPositions &&
                trackingPositions.length >= 2 && (
                  <Polyline
                    positions={trackingPositions}
                    pathOptions={{
                      color: "#22c55e", // verde tracking real
                      weight: 4,
                      opacity: 0.9,
                    }}
                  />
                )}

              {/* Origen */}
              <Marker position={origin}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{route.name}</p>
                    <p className="text-xs text-gray-500">
                      Origen: {route.origin.name ?? "Sin nombre"}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* Destino */}
              <Marker position={destination}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{route.name}</p>
                    <p className="text-xs text-gray-500">
                      Destino: {route.destination.name ?? "Sin nombre"}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default RoutesMapView;
