"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";

export type PickerPoint = {
  lat: number;
  lng: number;
  nombre?: string;
  operation?: "none" | "pickup" | "delivery" | "pickup_and_delivery";
  status?: "pending" | "in_progress" | "completed" | "failed" | "skipped";
};

interface RoutePickerMapProps {
  origin: PickerPoint | null;
  stops: PickerPoint[];
  destination: PickerPoint | null;
  activeTarget: "origin" | "stop" | "destination" | null;
  onMapClick: (point: PickerPoint) => void;
  isOpen: boolean;
}

const isValidPoint = (p: PickerPoint | null) => {
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
  if (Math.abs(p.lat) < 0.0001 && Math.abs(p.lng) < 0.0001) return false;
  return p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
};

const pointIcon = (label: string, color: string) =>
  L.divIcon({
    className: "route-point-label",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(15,23,42,.3);color:white;font:700 12px/1 Arial,sans-serif">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

function MapViewport({
  points,
  isOpen,
  mapRef,
}: {
  points: PickerPoint[];
  isOpen: boolean;
  mapRef: MutableRefObject<LeafletMap | null>;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      map.invalidateSize();
      map.stop();
      if (points.length === 1)
        map.setView([points[0].lat, points[0].lng], 13, { animate: false });
      if (points.length > 1) {
        const bounds = points.map(
          (point) => [point.lat, point.lng] as [number, number],
        );
        map.fitBounds(bounds, {
          padding: [40, 40],
          maxZoom: 14,
          animate: false,
        });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isOpen, mapRef, points]);

  return null;
}

function MapClickHandler({
  activeTarget,
  onMapClick,
}: Pick<RoutePickerMapProps, "activeTarget" | "onMapClick">) {
  const activeTargetRef = useRef(activeTarget);
  const onMapClickRef = useRef(onMapClick);
  useLayoutEffect(() => {
    activeTargetRef.current = activeTarget;
    onMapClickRef.current = onMapClick;
  }, [activeTarget, onMapClick]);
  const handlers = useMemo(() => ({
    click: (event: { latlng: { lat: number; lng: number } }) => {
      if (activeTargetRef.current)
        onMapClickRef.current({
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        });
    },
  }), []);
  useMapEvents(handlers);
  return null;
}

export default function RoutePickerMap({
  origin,
  stops,
  destination,
  activeTarget,
  onMapClick,
  isOpen,
}: RoutePickerMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const planned = [origin, ...stops, destination].filter(
    isValidPoint,
  ) as PickerPoint[];
  const center: LatLngExpression = planned[0]
    ? [planned[0].lat, planned[0].lng]
    : [-0.1807, -78.4678];

  return (
    <MapContainer
      ref={mapRef}
      center={center}
      zoom={11}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <MapClickHandler activeTarget={activeTarget} onMapClick={onMapClick} />
      <MapViewport points={planned} isOpen={isOpen} mapRef={mapRef} />

      {origin && isValidPoint(origin) && (
        <>
          <CircleMarker
            center={[origin.lat, origin.lng]}
            radius={10}
            pathOptions={{
              color: "#15803d",
              fillColor: "#22c55e",
              fillOpacity: 1,
            }}
          />
          <Marker
            position={[origin.lat, origin.lng]}
            icon={pointIcon("A", "#16a34a")}
          />
        </>
      )}
      {stops.filter(isValidPoint).map((point, index) => (
        <Fragment key={`stop-${index}`}>
          <CircleMarker
            center={[point.lat, point.lng]}
            radius={8}
            pathOptions={{
              color: "#0369a1",
              fillColor: "#38bdf8",
              fillOpacity: 1,
            }}
          />
          <Marker
            position={[point.lat, point.lng]}
            icon={pointIcon(String(index + 1), "#0284c7")}
          />
        </Fragment>
      ))}
      {destination && isValidPoint(destination) && (
        <>
          <CircleMarker
            center={[destination.lat, destination.lng]}
            radius={10}
            pathOptions={{
              color: "#b91c1c",
              fillColor: "#ef4444",
              fillOpacity: 1,
            }}
          />
          <Marker
            position={[destination.lat, destination.lng]}
            icon={pointIcon("B", "#dc2626")}
          />
        </>
      )}
      {planned.length >= 2 && (
        <Polyline
          positions={planned.map((point) => [point.lat, point.lng])}
          pathOptions={{
            color: "#3271a4",
            weight: 5,
            opacity: 0.85,
            dashArray: "8 8",
          }}
        />
      )}
    </MapContainer>
  );
}
