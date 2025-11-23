declare module "*.png" {
  const value: string;
  export default value;
}

// Fallback typings for leaflet when @types/leaflet is not installed
declare module "leaflet" {
  export type LatLngExpression = any;
  export type Map = any;
  const L: any;
  export default L;
}

// Minimal shims for react-leaflet to avoid type errors when @types are missing
declare module "react-leaflet" {
  export type MapContainerProps = any;
  export type TileLayerProps = any;
  export type CircleMarkerProps = any;
  export const MapContainer: any;
  export const TileLayer: any;
  export const Marker: any;
  export const Polyline: any;
  export const Popup: any;
  export const CircleMarker: any;
}
