"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, CircleMarker } from "react-leaflet";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";

export type PickerPoint = { lat: number; lng: number; nombre?: string };
export type SelectionMode = "none" | "origin" | "stop" | "destination";

interface RoutePickerMapProps {
  origin: PickerPoint | null;
  stops: PickerPoint[];
  destination: PickerPoint | null;
  pendingPoint: PickerPoint | null;
  selectionMode: SelectionMode;
  onMapClick: (point: PickerPoint) => void;
  onConfirmPending: () => void;
  onCancelPending: () => void;
  isOpen: boolean;
}

const isValidPoint = (p: PickerPoint | null) => {
  if (!p) return false;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
  if (Math.abs(p.lat) < 0.0001 && Math.abs(p.lng) < 0.0001) return false;
  return p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
};

function ClickHandler({ selectionMode, onMapClick }: { selectionMode: SelectionMode; onMapClick: (p: PickerPoint) => void }) {
  useMapEvents({
    click: (e) => {
      if (selectionMode === "none") return;
      const { lat, lng } = e.latlng;
      const point = { lat, lng };
      if (!isValidPoint(point)) return;
      onMapClick(point);
    },
  });
  return null;
}

export default function RoutePickerMap({
  origin,
  stops,
  destination,
  pendingPoint,
  selectionMode,
  onMapClick,
  onConfirmPending,
  onCancelPending,
  isOpen,
}: RoutePickerMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 80);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const planned: LatLngExpression[] = [];
  if (origin && isValidPoint(origin)) planned.push([origin.lat, origin.lng]);
  stops.filter(isValidPoint).forEach((p) => planned.push([p.lat, p.lng]));
  if (destination && isValidPoint(destination)) planned.push([destination.lat, destination.lng]);

  const center: LatLngExpression = planned[0] ?? [-12.0464, -77.0428];

  return (
    <MapContainer
      center={center}
      zoom={10}
      className="h-full w-full"
      whenCreated={(map) => {
        mapRef.current = map;
      }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <ClickHandler selectionMode={selectionMode} onMapClick={onMapClick} />

      {origin && isValidPoint(origin) && (
        <CircleMarker center={[origin.lat, origin.lng]} radius={8} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.9 }}>
          <Popup>Origen<br />{origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}</Popup>
        </CircleMarker>
      )}

      {stops.filter(isValidPoint).map((p, idx) => (
        <CircleMarker key={`stop-${idx}`} center={[p.lat, p.lng]} radius={7} pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.9 }}>
          <Popup>Parada {idx + 1}<br />{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</Popup>
        </CircleMarker>
      ))}

      {destination && isValidPoint(destination) && (
        <CircleMarker center={[destination.lat, destination.lng]} radius={8} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.9 }}>
          <Popup>Destino<br />{destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}</Popup>
        </CircleMarker>
      )}

      {pendingPoint && isValidPoint(pendingPoint) && (
        <Marker position={[pendingPoint.lat, pendingPoint.lng]}>
          <Popup autoPan={false}>
            <div className="space-y-2 text-xs text-gray-700">
              <p>
                Punto seleccionado<br />
                {pendingPoint.lat.toFixed(5)}, {pendingPoint.lng.toFixed(5)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 px-2 py-1 bg-[#3271a4] text-white rounded"
                  onClick={onConfirmPending}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded"
                  onClick={onCancelPending}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {planned.length >= 2 && (
        <Polyline positions={planned} pathOptions={{ color: "#3271a4", weight: 4, opacity: 0.8 }} />
      )}
    </MapContainer>
  );
}
