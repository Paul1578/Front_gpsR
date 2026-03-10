export type MapBaseStyle = "osm_light" | "osm_dark" | "osm_contrast";

export const MAP_STORAGE_KEYS = {
  options: "fleetflow:web:map-view-options",
  routeViewports: "fleetflow:web:map-route-viewports",
} as const;

export const MAP_TRACKING_CONFIG = {
  pollVisibleMs: 20000,
  pollHiddenMs: 90000,
  staleMs: 2 * 60 * 1000,
  offRouteThresholdMeters: 120,
  maxErrorBackoff: 4,
} as const;

export const MAP_LAYOUT_CONFIG = {
  defaultCenter: [-0.180653, -78.467834] as [number, number], // Quito aprox
  defaultZoom: 7,
  osrmCacheTtlMs: 10 * 60 * 1000,
} as const;

export const MAP_BASE_STYLE_OPTIONS: Array<{ value: MapBaseStyle; label: string }> = [
  { value: "osm_light", label: "OSM claro" },
  { value: "osm_dark", label: "OSM oscuro" },
  { value: "osm_contrast", label: "Alto contraste" },
];

const BASE_MAP_BY_STYLE: Record<
  MapBaseStyle,
  { url: string; attribution: string }
> = {
  osm_light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors',
  },
  osm_dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  },
  osm_contrast: {
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team',
  },
};

export const getBaseMapConfig = (style: MapBaseStyle) =>
  BASE_MAP_BY_STYLE[style] ?? BASE_MAP_BY_STYLE.osm_light;

export const isMapDebugEnabled = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEBUG_MAP === "true";
