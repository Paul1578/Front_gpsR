// src/Components/fleet/RoutesMapView.tsx
"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import type {
  LeafletEvent,
  LatLngExpression,
  Map as LeafletMap,
} from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteForMap } from "@/services/fleetApi";
import {
  getBaseMapConfig,
  MAP_LAYOUT_CONFIG,
  type MapBaseStyle,
} from "./mapRuntimeConfig";

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
type RouteViewport = {
  center: LatLngTuple;
  zoom: number;
};
type OsrmRouteResponse = {
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

interface RoutesMapViewProps {
  routes: RouteForMap[];
  selectedRouteId?: string | null;
  onRouteClick?: (routeId: string) => void;
  initialCenter?: LatLngExpression;
  initialZoom?: number;
  /** Tracking de la ruta seleccionada (si existe) */
  trackingPositions?: LatLngTuple[];
  /** Dispara el re-encuadre del mapa aunque la ruta no cambie */
  fitSignal?: number;
  /** Ubicación del usuario para centrar mapa bajo demanda */
  userLocation?: LatLngTuple | null;
  /** Señal para recentrar en la ubicación del usuario */
  focusUserSignal?: number;
  /** Señal para recentrar en la última posición del camión */
  focusTrackingSignal?: number;
  /** Seguir automáticamente al camión cuando llegan posiciones nuevas */
  followTracking?: boolean;
  /** Mostrar solo la ruta activa */
  showOnlySelectedRoute?: boolean;
  /** Mostrar marcadores de origen, destino y paradas */
  showStops?: boolean;
  /** Mostrar marcadores de origen y destino */
  showOriginDestinationMarkers?: boolean;
  /** Mostrar la línea de la ruta planificada */
  showPlannedLine?: boolean;
  /** Mostrar línea y punto de tracking real */
  showTrackingLine?: boolean;
  /** Estilo del mapa base */
  baseMapStyle?: MapBaseStyle;
  /** Viewport persistido por ruta */
  routeViewportByRouteId?: Record<string, RouteViewport>;
  /** Persistir viewport por ruta */
  onRouteViewportChange?: (routeId: string, viewport: RouteViewport) => void;
  /** Callback cuando el usuario mueve/zoomea el mapa manualmente */
  onUserInteraction?: () => void;
  /** Señal para invalidar tamaño del mapa (fullscreen/layout) */
  resizeSignal?: number;
}

const isUserDrivenMapEvent = (event: LeafletEvent) => {
  return "originalEvent" in event && Boolean(event.originalEvent);
};

const DEFAULT_CENTER: LatLngTuple = MAP_LAYOUT_CONFIG.defaultCenter;
const DEFAULT_ZOOM = MAP_LAYOUT_CONFIG.defaultZoom;
const OSRM_CACHE_TTL_MS = MAP_LAYOUT_CONFIG.osrmCacheTtlMs;
const osrmGeometryCache = new Map<
  string,
  { expiresAt: number; geometry: LatLngTuple[] }
>();

/**
 * Construye la polyline planificada:
 * origen -> puntos intermedios -> destino
 */
function buildRoutePolyline(route: RouteForMap): LatLngTuple[] {
  // Si el backend devuelve un array de points completo (incluyendo origen/destino),
  // úsalo tal cual. Si no, construye con origen y destino.
  if (Array.isArray(route.points) && route.points.length > 0) {
    return route.points.map((p) => [p.latitude, p.longitude] as LatLngTuple);
  }

  const fallback: LatLngTuple[] = [];
  if (route.origin) {
    fallback.push([route.origin.latitude, route.origin.longitude]);
  }
  if (route.destination) {
    fallback.push([route.destination.latitude, route.destination.longitude]);
  }
  return fallback;
}

/**
 * Llama a OSRM para obtener la geometría por carretera.
 */
async function fetchSnappedGeometry(
  planned: LatLngTuple[]
): Promise<LatLngTuple[] | null> {
  if (planned.length < 2) return null;

  const cacheKey = planned.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|");
  const cached = osrmGeometryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.geometry;
  }

  const coordsParam = planned
    .map(([lat, lng]) => `${lng},${lat}`) // OSRM usa lon,lat
    .join(";");

  const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = (await res.json()) as OsrmRouteResponse;
    const geometry = data.routes?.[0]?.geometry?.coordinates;

    if (!geometry || geometry.length < 2) {
      throw new Error("OSRM sin geometría");
    }

    // OSRM devuelve [lon, lat] → convertimos a [lat, lng]
    const normalized = geometry.map(([lng, lat]) => [lat, lng] as LatLngTuple);
    osrmGeometryCache.set(cacheKey, {
      geometry: normalized,
      expiresAt: Date.now() + OSRM_CACHE_TTL_MS,
    });
    return normalized;
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
  fitSignal,
  userLocation = null,
  focusUserSignal,
  focusTrackingSignal,
  followTracking = false,
  showOnlySelectedRoute = false,
  showStops = true,
  showOriginDestinationMarkers = true,
  showPlannedLine = true,
  showTrackingLine = true,
  baseMapStyle = "osm_light",
  routeViewportByRouteId,
  onRouteViewportChange,
  onUserInteraction,
  resizeSignal,
}: RoutesMapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const hasFitRef = useRef(false);
  const userMovedRef = useRef(false);
  const lastFitSignalRef = useRef<number | undefined>(undefined);
  const lastFocusTrackingSignalRef = useRef<number | undefined>(focusTrackingSignal);
  const lastFollowTargetRef = useRef<LatLngTuple | null>(null);
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomControlRef = useRef<ReturnType<typeof L.control.zoom> | null>(null);
  const zoomControlAttachedRef = useRef(false);
  const lastViewportEmitRef = useRef<{ routeId: string; zoom: number; center: LatLngTuple } | null>(null);
  const lastViewportRouteIdRef = useRef<string | null>(null);
  const selectedRouteIdRef = useRef<string | null>(selectedRouteId);

  const [snappedByRoute, setSnappedByRoute] = useState<
    Record<string, LatLngTuple[]>
  >({});

  useEffect(() => {
    selectedRouteIdRef.current = selectedRouteId;
  }, [selectedRouteId]);

  const handleMapUserMove = useCallback(() => {
    userMovedRef.current = true;
    onUserInteraction?.();
  }, [onUserInteraction]);

  const emitViewportForRoute = useCallback(
    (routeId: string) => {
      if (!onRouteViewportChange || !mapRef.current) return;
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      const nextCenter: LatLngTuple = [center.lat, center.lng];
      const prev = lastViewportEmitRef.current;
      if (
        prev &&
        prev.routeId === routeId &&
        prev.zoom === zoom &&
        Math.abs(prev.center[0] - nextCenter[0]) < 1e-6 &&
        Math.abs(prev.center[1] - nextCenter[1]) < 1e-6
      ) {
        return;
      }
      lastViewportEmitRef.current = { routeId, zoom, center: nextCenter };
      onRouteViewportChange(routeId, { center: nextCenter, zoom });
    },
    [onRouteViewportChange]
  );

  const handleMapReady = useCallback((map: LeafletMap) => {
    mapRef.current = map;
    map.on("dragstart", (event) => {
      if (isUserDrivenMapEvent(event)) {
        handleMapUserMove();
      }
    });
    map.on("zoomstart", (event) => {
      if (isUserDrivenMapEvent(event)) {
        handleMapUserMove();
      }
    });
    const mapWithScaleFlag = map as LeafletMap & {
      __fleetflowScaleAdded?: boolean;
    };
    if (!mapWithScaleFlag.__fleetflowScaleAdded) {
      L.control.scale({ position: "topright", imperial: false }).addTo(map);
      mapWithScaleFlag.__fleetflowScaleAdded = true;
    }
    if (!zoomControlRef.current) {
      zoomControlRef.current = L.control.zoom({ position: "bottomright" });
    }
    if (!followTracking && zoomControlRef.current && !zoomControlAttachedRef.current) {
      zoomControlRef.current.addTo(map);
      zoomControlAttachedRef.current = true;
    }
    setTimeout(() => {
      map.invalidateSize();
    }, 0);
    map.on("moveend", () => {
      if (selectedRouteIdRef.current) {
        emitViewportForRoute(selectedRouteIdRef.current);
      }
    });
    map.on("zoomend", () => {
      if (selectedRouteIdRef.current) {
        emitViewportForRoute(selectedRouteIdRef.current);
      }
    });
  }, [followTracking, handleMapUserMove, emitViewportForRoute]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );
  const renderedRoutes = useMemo(() => {
    if (!showOnlySelectedRoute || !selectedRouteId) return routes;
    return routes.filter((route) => route.id === selectedRouteId);
  }, [routes, selectedRouteId, showOnlySelectedRoute]);
  const baseMapConfig = useMemo(() => getBaseMapConfig(baseMapStyle), [baseMapStyle]);

  const trackingLatest = useMemo(() => {
    if (!trackingPositions || trackingPositions.length === 0) return null;
    return trackingPositions[trackingPositions.length - 1];
  }, [trackingPositions]);

  const trackingIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return L.divIcon({
      className: "",
      html: `
        <div style="width:28px;height:28px;border-radius:14px;background:#7c3aed;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(124,58,237,0.35);border:2px solid #fff;">
          <span style="font-size:14px;line-height:1;color:#fff;">🚚</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }, []);

  const userLocationIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return L.divIcon({
      className: "",
      html: `
        <div style="width:20px;height:20px;border-radius:10px;background:#1d4ed8;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(29,78,216,0.35);border:2px solid #fff;">
          <div style="width:6px;height:6px;border-radius:3px;background:#fff;"></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }, []);

  useEffect(() => {
    hasFitRef.current = false;
    userMovedRef.current = false;
  }, [selectedRouteId]);

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

  const savedViewportForSelectedRoute = useMemo(() => {
    if (!selectedRouteId || !routeViewportByRouteId) return null;
    return routeViewportByRouteId[selectedRouteId] ?? null;
  }, [routeViewportByRouteId, selectedRouteId]);

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
    const isForcedFit =
      fitSignal !== undefined && fitSignal !== lastFitSignalRef.current;
    if (!isForcedFit && savedViewportForSelectedRoute) return;
    if (!isForcedFit && (userMovedRef.current || hasFitRef.current)) return;

    const snapped = snappedByRoute[selectedRoute.id];
    const fallbackPlanned = buildRoutePolyline(selectedRoute);
    let boundsCoords: LatLngTuple[] =
      snapped && snapped.length >= 2 ? [...snapped] : [...fallbackPlanned];

    if (trackingPositions && trackingPositions.length >= 2) {
      boundsCoords = boundsCoords.concat(trackingPositions);
    } else if (trackingLatest) {
      boundsCoords = boundsCoords.concat([trackingLatest]);
    }

    if (boundsCoords.length === 0) return;

    const bounds = L.latLngBounds(
      boundsCoords.map(([lat, lng]) => L.latLng(lat, lng))
    );

    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    hasFitRef.current = true;
    if (fitSignal !== undefined) {
      lastFitSignalRef.current = fitSignal;
    }
  }, [
    selectedRoute,
    snappedByRoute,
    trackingPositions,
    trackingLatest,
    fitSignal,
    savedViewportForSelectedRoute,
  ]);

  useEffect(() => {
    if (!selectedRouteId || !mapRef.current) return;
    if (!savedViewportForSelectedRoute) return;
    if (lastViewportRouteIdRef.current === selectedRouteId) return;
    const { center, zoom } = savedViewportForSelectedRoute;
    mapRef.current.setView(center, zoom, { animate: false });
    hasFitRef.current = true;
    userMovedRef.current = true;
    lastViewportRouteIdRef.current = selectedRouteId;
  }, [selectedRouteId, savedViewportForSelectedRoute]);

  useEffect(() => {
    if (focusUserSignal === undefined) return;
    if (!mapRef.current || !userLocation) return;

    const nextZoom = Math.max(mapRef.current.getZoom(), 14);
    mapRef.current.flyTo(userLocation, nextZoom, {
      animate: true,
      duration: 0.8,
    });
    userMovedRef.current = true;
  }, [focusUserSignal, userLocation]);

  useEffect(() => {
    if (focusTrackingSignal === undefined) return;
    const isTriggeredFocus =
      focusTrackingSignal !== lastFocusTrackingSignalRef.current;
    if (!isTriggeredFocus) return;
    if (!mapRef.current) return;

    const fallbackTarget = selectedRoute
      ? (() => {
          const routePoints = buildRoutePolyline(selectedRoute);
          if (!routePoints.length) return null;
          return routePoints[routePoints.length - 1];
        })()
      : null;
    const target = trackingLatest ?? fallbackTarget;
    if (!target) return;

    const nextZoom = Math.max(mapRef.current.getZoom(), 15);
    mapRef.current.flyTo(target, nextZoom, {
      animate: true,
      duration: 0.8,
    });
    userMovedRef.current = true;
    lastFocusTrackingSignalRef.current = focusTrackingSignal;
  }, [focusTrackingSignal, trackingLatest, selectedRoute]);

  useEffect(() => {
    if (!followTracking) return;
    if (!mapRef.current || !trackingLatest) return;

    const target = L.latLng(trackingLatest[0], trackingLatest[1]);
    if (lastFollowTargetRef.current) {
      const prev = L.latLng(lastFollowTargetRef.current[0], lastFollowTargetRef.current[1]);
      // Evita animaciones innecesarias cuando la posición casi no cambia.
      if (prev.distanceTo(target) < 8) return;
    }

    const nextZoom = Math.max(mapRef.current.getZoom(), 15);
    mapRef.current.flyTo(target, nextZoom, {
      animate: true,
      duration: 0.45,
    });
    lastFollowTargetRef.current = trackingLatest;
  }, [followTracking, trackingLatest]);

  useEffect(() => {
    if (followTracking) return;
    lastFollowTargetRef.current = null;
  }, [followTracking]);

  useEffect(() => {
    if (resizeSignal === undefined) return;
    if (!mapRef.current) return;
    if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
    resizeDebounceRef.current = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);
    return () => {
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
    };
  }, [resizeSignal]);

  useEffect(() => {
    if (!mapRef.current || !zoomControlRef.current) return;
    if (followTracking && zoomControlAttachedRef.current) {
      mapRef.current.removeControl(zoomControlRef.current);
      zoomControlAttachedRef.current = false;
      return;
    }
    if (!followTracking && !zoomControlAttachedRef.current) {
      zoomControlRef.current.addTo(mapRef.current);
      zoomControlAttachedRef.current = true;
    }
  }, [followTracking]);

  return (
    <div className="routes-map-view w-full h-full min-h-0 rounded-xl overflow-hidden shadow-md bg-white">
      <MapContainer
        ref={mapRef}
        center={mapInitialCenter}
        zoom={initialZoom}
        preferCanvas
        dragging={!followTracking}
        scrollWheelZoom={!followTracking}
        doubleClickZoom={!followTracking}
        touchZoom={!followTracking}
        boxZoom={!followTracking}
        keyboard={!followTracking}
        zoomControl={false}
        className="w-full h-full"
        whenReady={() => {
          if (mapRef.current) {
            handleMapReady(mapRef.current);
          }
        }}
      >
        <TileLayer attribution={baseMapConfig.attribution} url={baseMapConfig.url} />

        {renderedRoutes.map((route) => {
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
              {showStops &&
                route.points?.map((p, idx) => {
                  const pos: LatLngTuple = [p.latitude, p.longitude];
                  return (
                    <Marker key={`${route.id}-stop-${idx}`} position={pos}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">{route.name}</p>
                          <p className="text-xs text-gray-500">
                            Parada: {p.name ?? `Punto ${idx + 1}`}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

              {/* Línea planificada (snapeada a carretera si OSRM respondió) */}
              {showPlannedLine && (
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
              )}

              {/* Tracking solo para la ruta seleccionada */}
              {isSelected &&
                showTrackingLine &&
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

              {isSelected && showTrackingLine && trackingLatest && (
                <Marker position={trackingLatest} icon={trackingIcon}>
                  <Popup>Ubicación actual</Popup>
                </Marker>
              )}

              {isSelected && userLocation && (
                <Marker position={userLocation} icon={userLocationIcon}>
                  <Popup>Mi ubicación</Popup>
                </Marker>
              )}

              {showOriginDestinationMarkers && (
                <>
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
                </>
              )}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default RoutesMapView;
