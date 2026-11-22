declare module "*.png" {
  const value: string;
  export default value;
}

// Fallback typings for the Leaflet APIs used by this application.
declare module "leaflet" {
  export type LatLngExpression =
    | [latitude: number, longitude: number]
    | { lat: number; lng: number };

  export interface LeafletMouseEvent {
    latlng: { lat: number; lng: number };
  }

  export interface Map {
    on(event: "click" | "dragstart" | "zoomstart", handler: (event: LeafletMouseEvent) => void): this;
    off(event: "click" | "dragstart" | "zoomstart", handler: (event: LeafletMouseEvent) => void): this;
    invalidateSize(): this;
    setView(center: LatLngExpression, zoom?: number): this;
    fitBounds(
      bounds: LatLngBounds | Array<[number, number]>,
      options?: { padding?: [number, number]; maxZoom?: number },
    ): this;
  }

  export interface LatLngBounds {
    isValid(): boolean;
  }

  export interface IconOptions {
    className?: string;
    html?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
  }

  export interface Icon {
    options: IconOptions;
  }

  export type DivIcon = Icon;

  export interface IconDefault {
    mergeOptions(options: {
      iconRetinaUrl?: string;
      iconUrl?: string;
      shadowUrl?: string;
    }): void;
  }

  const L: {
    divIcon(options: IconOptions): DivIcon;
    latLng(latitude: number, longitude: number): { lat: number; lng: number };
    latLngBounds(points: Array<[number, number]>): LatLngBounds;
    Icon: { Default: IconDefault };
  };
  export default L;
}

// Minimal component contracts for the React-Leaflet APIs used in JSX.
declare module "react-leaflet" {
  import type { ReactNode, Ref } from "react";
  import type { Icon, LatLngExpression, Map as LeafletMap } from "leaflet";

  export interface MapContainerProps {
    center: LatLngExpression;
    zoom: number;
    className?: string;
    scrollWheelZoom?: boolean;
    whenCreated?: (map: LeafletMap) => void;
    ref?: Ref<LeafletMap>;
    children?: ReactNode;
  }

  export interface TileLayerProps {
    url: string;
    attribution?: string;
  }

  export interface CircleMarkerProps {
    center: LatLngExpression;
    radius: number;
    pathOptions?: {
      color?: string;
      fillColor?: string;
      fillOpacity?: number;
    };
    children?: ReactNode;
  }

  export const MapContainer: (props: MapContainerProps) => ReactNode;
  export const TileLayer: (props: TileLayerProps) => ReactNode;
  export const Marker: (props: {
    position: LatLngExpression;
    icon?: Icon;
    children?: ReactNode;
  }) => ReactNode;
  export const Polyline: (props: {
    positions: LatLngExpression[];
    pathOptions?: { color?: string; weight?: number; opacity?: number; dashArray?: string };
    eventHandlers?: { click?: () => void };
    children?: ReactNode;
  }) => ReactNode;
  export const Popup: (props: { children?: ReactNode }) => ReactNode;
  export const CircleMarker: (props: CircleMarkerProps) => ReactNode;
}
