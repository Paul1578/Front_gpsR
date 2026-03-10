"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Marker } from "react-leaflet";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DriverRouteMapProps {
  currentLocation: [number, number] | null;
  origin?: { lat: number; lng: number; nombre?: string };
  stops: Array<{ lat: number; lng: number; nombre?: string }>;
  destination?: { lat: number; lng: number; nombre?: string };
}

type LatLngTuple = [number, number];

type OsrmResponse = {
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

const isValidPoint = (p?: { lat: number; lng: number } | null) => {
  if (!p) return false;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
  if (Math.abs(p.lat) < 0.0001 && Math.abs(p.lng) < 0.0001) return false;
  return p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
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
    const data = (await res.json()) as OsrmResponse;
    const geometry = data?.routes?.[0]?.geometry?.coordinates as
      | Array<[number, number]>
      | undefined;

    if (!geometry || geometry.length < 2) return null;
    return geometry.map(([lng, lat]) => [lat, lng] as LatLngTuple);
  } catch {
    return null;
  }
};

export default function DriverRouteMap({
  currentLocation,
  origin,
  stops,
  destination,
}: DriverRouteMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const hasFitRef = useRef(false);
  const userMovedRef = useRef(false);
  const [snappedRoute, setSnappedRoute] = useState<LatLngTuple[] | null>(null);
  const planned = useMemo<LatLngTuple[]>(() => {
    const list: LatLngTuple[] = [];
    if (origin && isValidPoint(origin)) list.push([origin.lat, origin.lng]);
    stops.filter(isValidPoint).forEach((p) => list.push([p.lat, p.lng]));
    if (destination && isValidPoint(destination)) list.push([destination.lat, destination.lng]);
    return list;
  }, [origin, stops, destination]);

  const plannedKey = useMemo(
    () => planned.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|"),
    [planned]
  );

  useEffect(() => {
    let cancelled = false;
    if (planned.length < 2) {
      return;
    }

    const load = async () => {
      const snapped = await fetchSnappedGeometry(planned);
      if (!cancelled) {
        setSnappedRoute(snapped ?? null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [planned]);

  const tracking: LatLngTuple[] = [];
  if (currentLocation) {
    tracking.push([currentLocation[0], currentLocation[1]]);
  }

  const routeToDisplay: LatLngTuple[] =
    planned.length >= 2 && snappedRoute && snappedRoute.length >= 2
      ? snappedRoute
      : planned;

  const center: LatLngExpression =
    routeToDisplay[0] ?? tracking[0] ?? [-0.180653, -78.467834];

  const truckIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return L.divIcon({
      className: "",
      html: `
        <div style="width:32px;height:32px;border-radius:16px;background:#2563eb;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(37,99,235,0.35);border:2px solid #fff;">
          <span style="font-size:16px;line-height:1;color:#fff;">🚚</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  useEffect(() => {
    hasFitRef.current = false;
    userMovedRef.current = false;
  }, [plannedKey]);

  useEffect(() => {
    if (!mapRef.current || hasFitRef.current || userMovedRef.current) return;
    const points: LatLngTuple[] = [];
    if (routeToDisplay.length >= 2) points.push(...routeToDisplay);
    if (currentLocation) points.push([currentLocation[0], currentLocation[1]]);
    if (points.length < 2) return;
    mapRef.current.fitBounds(points, { padding: [40, 40] });
    hasFitRef.current = true;
  }, [routeToDisplay, currentLocation]);

  const handleMapReady = () => {
    const map = mapRef.current;
    if (!map) return;
    const markMoved = () => {
      userMovedRef.current = true;
    };
    map.on("dragstart", markMoved);
    map.on("zoomstart", markMoved);
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={(map) => {
          mapRef.current = map;
        }}
        center={center}
        zoom={12}
        className="w-full h-full"
        whenReady={handleMapReady}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {routeToDisplay.length >= 2 && (
          <Polyline
            positions={routeToDisplay}
            pathOptions={{ color: "#3271a4", weight: 4, opacity: 0.8 }}
          />
        )}

        {origin && isValidPoint(origin) && (
          <CircleMarker
            center={[origin.lat, origin.lng]}
            radius={8}
            pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.95 }}
          >
            <Popup>
              Origen<br />
              {origin.nombre ?? `${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}`}
            </Popup>
          </CircleMarker>
        )}

        {stops.filter(isValidPoint).map((stop, index) => (
          <CircleMarker
            key={`stop-${index}`}
            center={[stop.lat, stop.lng]}
            radius={7}
            pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.95 }}
          >
            <Popup>
              Parada {index + 1}<br />
              {stop.nombre ?? `${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}`}
            </Popup>
          </CircleMarker>
        ))}

        {destination && isValidPoint(destination) && (
          <CircleMarker
            center={[destination.lat, destination.lng]}
            radius={8}
            pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.95 }}
          >
            <Popup>
              Destino<br />
              {destination.nombre ?? `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`}
            </Popup>
          </CircleMarker>
        )}

        {currentLocation && (
          <Marker
            position={[currentLocation[0], currentLocation[1]]}
            icon={truckIcon}
          >
            <Popup>Ubicación actual</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
