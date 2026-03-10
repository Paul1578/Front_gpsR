// src/Components/fleet/MapView.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Layers,
  LocateFixed,
  Maximize2,
  Minimize2,
  RefreshCw,
  Route as RoutePath,
  Truck,
} from "lucide-react";

import { useAuth } from "@/Context/AuthContext";
import { useFleet } from "@/Context/FleetContext";
import {
  fetchRoutes,
  fetchRoutePositions,
  mapRoutesApiToRoutesForMap,
  type RouteForMap,
  type RoutePositionDto,
} from "@/services/fleetApi";
import RoutesMapView from "./RoutesMapView";
import {
  isMapDebugEnabled,
  MAP_BASE_STYLE_OPTIONS,
  MAP_STORAGE_KEYS,
  MAP_TRACKING_CONFIG,
  type MapBaseStyle,
} from "./mapRuntimeConfig";

export interface MapViewProps {
  onBack?: () => void;
}

type LatLngTuple = [number, number];
type OsrmRouteResponse = {
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};
type TrackingPositionSource = Partial<Pick<RoutePositionDto, "recordedAt">> & {
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
};
type RouteStatusFilter = "all" | "pending" | "in_progress" | "completed" | "cancelled";
type RouteViewport = {
  center: LatLngTuple;
  zoom: number;
};
type PersistedMapOptions = {
  showOnlySelectedRoute: boolean;
  showStops: boolean;
  showOriginDestinationMarkers: boolean;
  showPlannedLine: boolean;
  showTrackingLine: boolean;
  showRoutesPanel: boolean;
  routeStatusFilter: RouteStatusFilter;
  highDensityRoutes: boolean;
  baseMapStyle: MapBaseStyle;
};
type TrackingDiagnostics = {
  requests: number;
  successes: number;
  errors: number;
  lastStatus: number | null;
  lastLatencyMs: number | null;
  avgLatencyMs: number | null;
};

const MAP_OPTIONS_STORAGE_KEY = MAP_STORAGE_KEYS.options;
const MAP_VIEWPORT_STORAGE_KEY = MAP_STORAGE_KEYS.routeViewports;
const TRACKING_POLL_VISIBLE_MS = MAP_TRACKING_CONFIG.pollVisibleMs;
const TRACKING_POLL_HIDDEN_MS = MAP_TRACKING_CONFIG.pollHiddenMs;
const TRACKING_STALE_MS = MAP_TRACKING_CONFIG.staleMs;
const OFF_ROUTE_THRESHOLD_METERS = MAP_TRACKING_CONFIG.offRouteThresholdMeters;
const DEFAULT_MAP_OPTIONS: PersistedMapOptions = {
  showOnlySelectedRoute: false,
  showStops: true,
  showOriginDestinationMarkers: true,
  showPlannedLine: true,
  showTrackingLine: true,
  showRoutesPanel: true,
  routeStatusFilter: "all",
  highDensityRoutes: false,
  baseMapStyle: "osm_light",
};
const TRACKING_MAX_ERROR_BACKOFF = MAP_TRACKING_CONFIG.maxErrorBackoff;
const DEBUG_MAP_ENABLED = isMapDebugEnabled();

const readPersistedMapOptions = (): PersistedMapOptions => {
  if (typeof window === "undefined") return DEFAULT_MAP_OPTIONS;
  try {
    const raw = window.localStorage.getItem(MAP_OPTIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_MAP_OPTIONS;
    const parsed = JSON.parse(raw) as Partial<PersistedMapOptions>;
    return {
      showOnlySelectedRoute:
        typeof parsed.showOnlySelectedRoute === "boolean"
          ? parsed.showOnlySelectedRoute
          : DEFAULT_MAP_OPTIONS.showOnlySelectedRoute,
      showStops:
        typeof parsed.showStops === "boolean"
          ? parsed.showStops
          : DEFAULT_MAP_OPTIONS.showStops,
      showOriginDestinationMarkers:
        typeof parsed.showOriginDestinationMarkers === "boolean"
          ? parsed.showOriginDestinationMarkers
          : DEFAULT_MAP_OPTIONS.showOriginDestinationMarkers,
      showPlannedLine:
        typeof parsed.showPlannedLine === "boolean"
          ? parsed.showPlannedLine
          : DEFAULT_MAP_OPTIONS.showPlannedLine,
      showTrackingLine:
        typeof parsed.showTrackingLine === "boolean"
          ? parsed.showTrackingLine
          : DEFAULT_MAP_OPTIONS.showTrackingLine,
      showRoutesPanel:
        typeof parsed.showRoutesPanel === "boolean"
          ? parsed.showRoutesPanel
          : DEFAULT_MAP_OPTIONS.showRoutesPanel,
      routeStatusFilter:
        parsed.routeStatusFilter === "all" ||
        parsed.routeStatusFilter === "pending" ||
        parsed.routeStatusFilter === "in_progress" ||
        parsed.routeStatusFilter === "completed" ||
        parsed.routeStatusFilter === "cancelled"
          ? parsed.routeStatusFilter
          : DEFAULT_MAP_OPTIONS.routeStatusFilter,
      highDensityRoutes:
        typeof parsed.highDensityRoutes === "boolean"
          ? parsed.highDensityRoutes
          : DEFAULT_MAP_OPTIONS.highDensityRoutes,
      baseMapStyle:
        parsed.baseMapStyle === "osm_light" ||
        parsed.baseMapStyle === "osm_dark" ||
        parsed.baseMapStyle === "osm_contrast"
          ? parsed.baseMapStyle
          : DEFAULT_MAP_OPTIONS.baseMapStyle,
    };
  } catch {
    return DEFAULT_MAP_OPTIONS;
  }
};

const readPersistedRouteViewports = (): Record<string, RouteViewport> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MAP_VIEWPORT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RouteViewport>;
    if (!parsed || typeof parsed !== "object") return {};
    const sanitized: Record<string, RouteViewport> = {};
    Object.entries(parsed).forEach(([routeId, viewport]) => {
      if (
        Array.isArray(viewport?.center) &&
        viewport.center.length === 2 &&
        Number.isFinite(viewport.center[0]) &&
        Number.isFinite(viewport.center[1]) &&
        Number.isFinite(viewport.zoom)
      ) {
        sanitized[routeId] = {
          center: [viewport.center[0], viewport.center[1]],
          zoom: viewport.zoom,
        };
      }
    });
    return sanitized;
  } catch {
    return {};
  }
};

const parseCoord = (value?: number | string): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildPlannedPolylineFromRoute = (route: RouteForMap | null): LatLngTuple[] => {
  if (!route) return [];
  if (Array.isArray(route.points) && route.points.length > 0) {
    return route.points.map((point) => [point.latitude, point.longitude]);
  }
  const fallback: LatLngTuple[] = [];
  if (route.origin) fallback.push([route.origin.latitude, route.origin.longitude]);
  if (route.destination) fallback.push([route.destination.latitude, route.destination.longitude]);
  return fallback;
};

const toRadians = (value: number) => (value * Math.PI) / 180;
const distanceMeters = (a: LatLngTuple, b: LatLngTuple) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b[0] - a[0]);
  const dLng = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const distanceToSegmentMeters = (
  point: LatLngTuple,
  segmentStart: LatLngTuple,
  segmentEnd: LatLngTuple
) => {
  const meanLat = toRadians((segmentStart[0] + segmentEnd[0]) / 2);
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(meanLat);
  const toMeters = (coord: LatLngTuple) => ({
    x: coord[1] * mPerDegLng,
    y: coord[0] * mPerDegLat,
  });
  const p = toMeters(point);
  const a = toMeters(segmentStart);
  const b = toMeters(segmentEnd);
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const abLenSq = abX * abX + abY * abY;
  if (abLenSq === 0) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abX + (p.y - a.y) * abY) / abLenSq));
  const projX = a.x + t * abX;
  const projY = a.y + t * abY;
  const dx = p.x - projX;
  const dy = p.y - projY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getDistanceToPolylineMeters = (point: LatLngTuple, polyline: LatLngTuple[]) => {
  if (polyline.length === 0) return null;
  if (polyline.length === 1) return distanceMeters(point, polyline[0]);
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polyline.length - 1; i += 1) {
    const distance = distanceToSegmentMeters(point, polyline[i], polyline[i + 1]);
    if (distance < minDistance) minDistance = distance;
  }
  return Number.isFinite(minDistance) ? minDistance : null;
};

const formatTrackingAge = (msAgo: number) => {
  if (msAgo < 1000) return "ahora";
  const seconds = Math.floor(msAgo / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

const statusToFilter = (
  status?: number
): Exclude<RouteStatusFilter, "all"> => {
  if (status === 1) return "in_progress";
  if (status === 2) return "completed";
  if (status === 3) return "cancelled";
  return "pending";
};

const getTrackingPollDelay = (
  isHidden: boolean,
  errorCount: number,
  lastStatus: number | null,
  isOnline: boolean
) => {
  const base = isHidden ? TRACKING_POLL_HIDDEN_MS : TRACKING_POLL_VISIBLE_MS;
  if (!isOnline) return Math.max(base * 2, 120000);

  let multiplier =
    errorCount <= 0
      ? 1
      : Math.min(TRACKING_MAX_ERROR_BACKOFF, 1 + errorCount * 0.75);
  if (lastStatus === 429) multiplier = Math.max(multiplier, 3);
  if (lastStatus === 401 || lastStatus === 403) multiplier = Math.max(multiplier, 4);
  if (lastStatus != null && lastStatus >= 500) multiplier = Math.max(multiplier, 2.25);

  // jitter leve para evitar picos sincronizados de polling
  const jitter = 0.9 + Math.random() * 0.2;
  return Math.round(base * multiplier * jitter);
};

const parseApiErrorMeta = (error: unknown) => {
  const enriched = error as Error & {
    status?: number;
    data?: { message?: string } | null;
  };
  const status =
    typeof enriched?.status === "number" ? enriched.status : null;
  const message =
    (typeof enriched?.data?.message === "string" && enriched.data.message) ||
    (typeof enriched?.message === "string" && enriched.message) ||
    "Error de red";
  return { status, message };
};

const normalizeTrackingPositions = (positions: RoutePositionDto[]): LatLngTuple[] => {
  const sorted = [...positions].sort((a, b) => {
    const aTime = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
    const bTime = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
    return aTime - bTime;
  });

  return sorted
    .map((p) => {
      const candidate = p as TrackingPositionSource;
      const lat = parseCoord(candidate.latitude ?? candidate.lat);
      const lng = parseCoord(candidate.longitude ?? candidate.lng);
      if (lat == null || lng == null) return null;
      return [lat, lng] as LatLngTuple;
    })
    .filter((v): v is LatLngTuple => v !== null);
};

const areLatLngArraysEqual = (a: LatLngTuple[], b: LatLngTuple[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
};

const fetchSnappedGeometry = async (
  planned: LatLngTuple[]
): Promise<LatLngTuple[] | null> => {
  if (planned.length < 2) return null;

  const coordsParam = planned.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = (await res.json()) as OsrmRouteResponse;
    const geometry = data.routes?.[0]?.geometry?.coordinates;
    if (!geometry || geometry.length < 2) return null;
    return geometry.map(([lng, lat]) => [lat, lng] as LatLngTuple);
  } catch {
    return null;
  }
};

export function MapView({ onBack }: MapViewProps) {
  const { apiFetch, getAllUsers } = useAuth();
  const { vehicles, drivers } = useFleet();
  const initialMapOptions = useMemo(readPersistedMapOptions, []);
  const initialRouteViewports = useMemo(readPersistedRouteViewports, []);

  const [routes, setRoutes] = useState<RouteForMap[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trackingPositions, setTrackingPositions] = useState<LatLngTuple[]>([]);
  const [trackingDisplay, setTrackingDisplay] = useState<LatLngTuple[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLngTuple | null>(null);
  const [focusUserSignal, setFocusUserSignal] = useState(0);
  const [focusTrackingSignal, setFocusTrackingSignal] = useState(0);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [followTruck, setFollowTruck] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeControlHint, setActiveControlHint] = useState<string | null>(null);
  const [showOnlySelectedRoute, setShowOnlySelectedRoute] = useState(
    initialMapOptions.showOnlySelectedRoute
  );
  const [showStops, setShowStops] = useState(initialMapOptions.showStops);
  const [showOriginDestinationMarkers, setShowOriginDestinationMarkers] = useState(
    initialMapOptions.showOriginDestinationMarkers
  );
  const [showPlannedLine, setShowPlannedLine] = useState(
    initialMapOptions.showPlannedLine
  );
  const [showTrackingLine, setShowTrackingLine] = useState(
    initialMapOptions.showTrackingLine
  );
  const [showRoutesPanel, setShowRoutesPanel] = useState(
    initialMapOptions.showRoutesPanel
  );
  const [routeStatusFilter, setRouteStatusFilter] = useState<RouteStatusFilter>(
    initialMapOptions.routeStatusFilter
  );
  const [highDensityRoutes, setHighDensityRoutes] = useState(
    initialMapOptions.highDensityRoutes
  );
  const [baseMapStyle, setBaseMapStyle] = useState<MapBaseStyle>(
    initialMapOptions.baseMapStyle
  );
  const [routeViewportsById, setRouteViewportsById] = useState<
    Record<string, RouteViewport>
  >(initialRouteViewports);
  const [routeSearchQuery, setRouteSearchQuery] = useState("");
  const [canCollapseRoutesPanel, setCanCollapseRoutesPanel] = useState(false);
  const [showMapOptions, setShowMapOptions] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [resizeSignal, setResizeSignal] = useState(0);
  const [trackingRefreshSignal, setTrackingRefreshSignal] = useState(0);
  const [lastTrackingSyncAt, setLastTrackingSyncAt] = useState<number | null>(null);
  const [trackingErrorCount, setTrackingErrorCount] = useState(0);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [trackingLastErrorStatus, setTrackingLastErrorStatus] = useState<number | null>(null);
  const [latestTrackingSample, setLatestTrackingSample] = useState<{
    recordedAt?: string;
    speedKmh?: number;
    heading?: number;
  } | null>(null);
  const [trackingDiagnostics, setTrackingDiagnostics] = useState<TrackingDiagnostics>({
    requests: 0,
    successes: 0,
    errors: 0,
    lastStatus: null,
    lastLatencyMs: null,
    avgLatencyMs: null,
  });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastManualRefreshSignalRef = useRef(0);
  const trackingPositionsRef = useRef<LatLngTuple[]>([]);
  const trackingErrorCountRef = useRef(0);
  const trackingLastErrorStatusRef = useRef<number | null>(null);
  const trackingRequestAbortRef = useRef<AbortController | null>(null);
  const optionsPanelId = "map-view-options-panel";
  const users = useMemo(() => getAllUsers(), [getAllUsers]);
  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );
  const driverById = useMemo(
    () => new Map(drivers.map((driver) => [driver.id, driver])),
    [drivers]
  );
  const driverLabelById = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((user) => {
      const label =
        [user.nombres, user.apellidos].filter(Boolean).join(" ").trim() ||
        user.usuario ||
        "Conductor no disponible";
      if (user.driverId) map.set(user.driverId, label);
      map.set(user.id, label);
    });
    return map;
  }, [users]);
  const normalizedRouteSearch = routeSearchQuery.trim().toLowerCase();

  const updateTrackingErrorCount = useCallback((next: number) => {
    trackingErrorCountRef.current = next;
    setTrackingErrorCount(next);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncOnlineStatus = () => setIsOnline(window.navigator.onLine);
    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);
    return () => {
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
    };
  }, []);

  // --------- CARGA DE RUTAS PLANIFICADAS ---------
  useEffect(() => {
    if (!apiFetch) return;
    let cancelled = false;

    const loadRoutes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiRoutes = await fetchRoutes(apiFetch);
        if (cancelled) return;

        const filtered = apiRoutes.filter((r) => r.isActive !== false);
        const mapped = mapRoutesApiToRoutesForMap(filtered);
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

  const filteredRoutes = useMemo(() => {
    const byStatus =
      routeStatusFilter === "all"
        ? routes
        : routes.filter((route) => statusToFilter(route.status) === routeStatusFilter);
    if (!normalizedRouteSearch) return byStatus;

    return byStatus.filter((route) => {
      const vehicle = route.vehicleId ? vehicleById.get(route.vehicleId) : undefined;
      const driver = route.driverId ? driverById.get(route.driverId) : undefined;
      const fields = [
        route.name ?? "",
        [vehicle?.modelo, vehicle?.marca, vehicle?.placa].filter(Boolean).join(" "),
        [driver?.firstName, driver?.lastName].filter(Boolean).join(" "),
        route.driverId ? driverLabelById.get(route.driverId) ?? "" : "",
      ];
      return fields.some((field) =>
        field.toLowerCase().includes(normalizedRouteSearch)
      );
    });
  }, [
    routeStatusFilter,
    routes,
    normalizedRouteSearch,
    vehicleById,
    driverById,
    driverLabelById,
  ]);

  const effectiveSelectedRouteId = useMemo(() => {
    if (filteredRoutes.length === 0) return null;
    if (selectedRouteId && filteredRoutes.some((route) => route.id === selectedRouteId)) {
      return selectedRouteId;
    }
    return filteredRoutes[0]?.id ?? null;
  }, [filteredRoutes, selectedRouteId]);

  const runTrackingFetch = useCallback(
    async (withSpinner = false) => {
      if (!apiFetch || !effectiveSelectedRouteId) return false;

      if (!isOnline) {
        setTrackingLastErrorStatus(null);
        trackingLastErrorStatusRef.current = null;
        return false;
      }

      if (withSpinner) setIsLoadingTracking(true);

      trackingRequestAbortRef.current?.abort();
      const controller = new AbortController();
      trackingRequestAbortRef.current = controller;
      const requestStartedAt = Date.now();
      setTrackingDiagnostics((prev) => ({
        ...prev,
        requests: prev.requests + 1,
      }));

      try {
        const apiPositions = await fetchRoutePositions(
          apiFetch,
          effectiveSelectedRouteId,
          undefined,
          undefined,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return false;

        const sortedByTime = [...apiPositions].sort((a, b) => {
          const aTime = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
          const bTime = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
          return aTime - bTime;
        });
        const latestPosition = sortedByTime[sortedByTime.length - 1];
        setLatestTrackingSample(
          latestPosition
            ? {
                recordedAt: latestPosition.recordedAt,
                speedKmh: latestPosition.speedKmh,
                heading: latestPosition.heading,
              }
            : null
        );

        const coords = normalizeTrackingPositions(apiPositions);
        const hasChanges = !areLatLngArraysEqual(trackingPositionsRef.current, coords);
        if (hasChanges) {
          trackingPositionsRef.current = coords;
          setTrackingPositions(coords);
        }
        setLastTrackingSyncAt(Date.now());
        setTrackingLastErrorStatus(null);
        trackingLastErrorStatusRef.current = null;
        if (trackingErrorCountRef.current !== 0) {
          updateTrackingErrorCount(0);
        }
        const latencyMs = Math.max(0, Date.now() - requestStartedAt);
        setTrackingDiagnostics((prev) => {
          const successes = prev.successes + 1;
          const avgLatencyMs =
            prev.avgLatencyMs == null
              ? latencyMs
              : Math.round((prev.avgLatencyMs * prev.successes + latencyMs) / successes);
          return {
            ...prev,
            successes,
            lastStatus: 200,
            lastLatencyMs: latencyMs,
            avgLatencyMs,
          };
        });
        return true;
      } catch (errorResponse) {
        if (controller.signal.aborted) return false;
        const { status, message } = parseApiErrorMeta(errorResponse);
        setTrackingLastErrorStatus(status);
        trackingLastErrorStatusRef.current = status;
        console.warn("Tracking polling error:", message);
        updateTrackingErrorCount(Math.min(trackingErrorCountRef.current + 1, 6));
        const latencyMs = Math.max(0, Date.now() - requestStartedAt);
        setTrackingDiagnostics((prev) => ({
          ...prev,
          errors: prev.errors + 1,
          lastStatus: status,
          lastLatencyMs: latencyMs,
        }));
        return false;
      } finally {
        if (trackingRequestAbortRef.current === controller) {
          trackingRequestAbortRef.current = null;
        }
        if (withSpinner) setIsLoadingTracking(false);
      }
    },
    [apiFetch, effectiveSelectedRouteId, isOnline, updateTrackingErrorCount]
  );

  // --------- CARGA DE TRACKING PARA LA RUTA SELECCIONADA ---------
  useEffect(() => {
    if (!apiFetch || !effectiveSelectedRouteId) {
      setTrackingPositions([]);
      trackingPositionsRef.current = [];
      setLatestTrackingSample(null);
      setLastTrackingSyncAt(null);
      setIsLoadingTracking(false);
      setTrackingLastErrorStatus(null);
      trackingLastErrorStatusRef.current = null;
      updateTrackingErrorCount(0);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextPoll = () => {
      if (cancelled) return;
      const isHidden =
        typeof document !== "undefined" && document.visibilityState !== "visible";
      const nextDelay = getTrackingPollDelay(
        isHidden,
        trackingErrorCountRef.current,
        trackingLastErrorStatusRef.current,
        isOnline
      );
      timeoutId = setTimeout(async () => {
        await runTrackingFetch(false);
        scheduleNextPoll();
      }, nextDelay);
    };

    const handleVisibilityChange = () => {
      if (cancelled || typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        void runTrackingFetch(false);
      }
    };

    void runTrackingFetch(true);
    scheduleNextPoll();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      trackingRequestAbortRef.current?.abort();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [
    apiFetch,
    effectiveSelectedRouteId,
    isOnline,
    runTrackingFetch,
    updateTrackingErrorCount,
  ]);

  useEffect(() => {
    if (!apiFetch || !effectiveSelectedRouteId) return;
    if (trackingRefreshSignal === lastManualRefreshSignalRef.current) return;
    lastManualRefreshSignalRef.current = trackingRefreshSignal;

    const refreshNow = async () => {
      await runTrackingFetch(true);
    };

    void refreshNow();
  }, [apiFetch, effectiveSelectedRouteId, runTrackingFetch, trackingRefreshSignal]);

  useEffect(() => {
    if (!isOnline) return;
    if (!apiFetch || !effectiveSelectedRouteId) return;
    void runTrackingFetch(false);
  }, [isOnline, apiFetch, effectiveSelectedRouteId, runTrackingFetch]);

  useEffect(() => {
    let cancelled = false;
    if (trackingPositions.length < 2) {
      setTrackingDisplay((prev) =>
        areLatLngArraysEqual(prev, trackingPositions) ? prev : trackingPositions
      );
      return;
    }
    const tail = trackingPositions.slice(-8);
    const snap = async () => {
      const snapped = await fetchSnappedGeometry(tail);
      if (!cancelled) {
        const next = snapped ?? tail;
        setTrackingDisplay((prev) =>
          areLatLngArraysEqual(prev, next) ? prev : next
        );
      }
    };
    void snap();
    return () => {
      cancelled = true;
    };
  }, [trackingPositions]);

  // --------- DERIVADOS PARA UI ---------
  const selectedRoute = useMemo(
    () => filteredRoutes.find((r) => r.id === effectiveSelectedRouteId) ?? null,
    [effectiveSelectedRouteId, filteredRoutes]
  );
  const trackingLatest = useMemo(
    () => (trackingDisplay.length ? trackingDisplay[trackingDisplay.length - 1] : null),
    [trackingDisplay]
  );

  const formatVehicleLabel = (vehicleId?: string) => {
    if (!vehicleId) return "Vehículo no asignado";
    const vehicle = vehicleById.get(vehicleId);
    if (!vehicle) return "Vehículo no disponible";
    const name = [vehicle.modelo, vehicle.marca].filter(Boolean).join(" ").trim();
    if (name && vehicle.placa) return `${name} (${vehicle.placa})`;
    return name || vehicle.placa || "Vehículo no disponible";
  };

  const formatDriverLabel = (driverId?: string) => {
    if (!driverId) return "Conductor no asignado";
    const driver = driverById.get(driverId);
    if (driver) {
      const fullName = [driver.firstName, driver.lastName].filter(Boolean).join(" ").trim();
      if (fullName) return fullName;
    }
    return driverLabelById.get(driverId) ?? "Conductor no disponible";
  };

  const stopsCount = useMemo(() => {
    if (!selectedRoute || !Array.isArray(selectedRoute.points)) return 0;
    // el backend incluye origen/destino en points; contamos intermedios
    return Math.max(selectedRoute.points.length - 2, 0);
  }, [selectedRoute]);

  const summary = { routes: filteredRoutes.length, totalRoutes: routes.length, stopsCount };
  const isRoutesPanelVisible = !canCollapseRoutesPanel || showRoutesPanel;
  const statusCounts = useMemo(() => {
    return routes.reduce(
      (acc, route) => {
        const key = statusToFilter(route.status);
        acc[key] += 1;
        return acc;
      },
      {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      } as Record<Exclude<RouteStatusFilter, "all">, number>
    );
  }, [routes]);
  const statusKpiItems = useMemo(
    () => [
      {
        value: "all" as RouteStatusFilter,
        label: "Todas",
        count: summary.totalRoutes,
        activeClass:
          "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100",
        inactiveClass:
          "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
      },
      {
        value: "pending" as RouteStatusFilter,
        label: "Pendientes",
        count: statusCounts.pending,
        activeClass:
          "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
        inactiveClass:
          "border-amber-200 bg-white text-amber-700 hover:border-amber-300 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-200",
      },
      {
        value: "in_progress" as RouteStatusFilter,
        label: "En curso",
        count: statusCounts.in_progress,
        activeClass:
          "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
        inactiveClass:
          "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-200",
      },
      {
        value: "completed" as RouteStatusFilter,
        label: "Completadas",
        count: statusCounts.completed,
        activeClass:
          "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
        inactiveClass:
          "border-blue-200 bg-white text-blue-700 hover:border-blue-300 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-200",
      },
      {
        value: "cancelled" as RouteStatusFilter,
        label: "Canceladas",
        count: statusCounts.cancelled,
        activeClass:
          "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200",
        inactiveClass:
          "border-red-200 bg-white text-red-700 hover:border-red-300 dark:border-red-800 dark:bg-slate-800 dark:text-red-200",
      },
    ],
    [summary.totalRoutes, statusCounts]
  );

  const getStatusMeta = (status?: number) => {
    switch (status) {
      case 1:
        return { label: "En curso", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-900/50" };
      case 2:
        return { label: "Completada", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-900/50" };
      case 3:
        return { label: "Cancelada", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-900/50" };
      default:
        return { label: "Planificada", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-900/50" };
    }
  };

  const statusMeta = getStatusMeta(selectedRoute?.status);
  const trackingHealthMeta = useMemo(() => {
    if (!effectiveSelectedRouteId) return null;
    if (!isOnline) {
      return {
        label: "Sin conexión",
        className:
          "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-900/50",
      };
    }
    if (isLoadingTracking) {
      return {
        label: "Sincronizando",
        className:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-900/50",
      };
    }
    if (trackingErrorCount > 0) {
      const errorLabel =
        trackingLastErrorStatus === 429
          ? "Límite de API"
          : trackingLastErrorStatus === 403 || trackingLastErrorStatus === 401
          ? "Sin permisos tracking"
          : `Reintentando (${trackingErrorCount})`;
      return {
        label: errorLabel,
        className:
          "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-900/50",
      };
    }
    if (lastTrackingSyncAt) {
      return {
        label: "Tracking activo",
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-900/50",
      };
    }
    return {
      label: "Sin datos",
      className:
        "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-900/50",
    };
  }, [
    effectiveSelectedRouteId,
    isOnline,
    isLoadingTracking,
    lastTrackingSyncAt,
    trackingErrorCount,
    trackingLastErrorStatus,
  ]);
  const selectedPlannedPolyline = useMemo(
    () => buildPlannedPolylineFromRoute(selectedRoute),
    [selectedRoute]
  );
  const trackingAgeMs = useMemo(() => {
    if (!latestTrackingSample?.recordedAt) return null;
    const recordedAtMs = new Date(latestTrackingSample.recordedAt).getTime();
    if (!Number.isFinite(recordedAtMs)) return null;
    const nowMs = lastTrackingSyncAt ?? Date.now();
    return Math.max(0, nowMs - recordedAtMs);
  }, [latestTrackingSample?.recordedAt, lastTrackingSyncAt]);
  const routeDistanceDeviation = useMemo(() => {
    if (!trackingLatest || selectedPlannedPolyline.length < 2) return null;
    return getDistanceToPolylineMeters(trackingLatest, selectedPlannedPolyline);
  }, [trackingLatest, selectedPlannedPolyline]);
  const routeAlerts = useMemo(() => {
    const alerts: Array<{ key: string; label: string; level: "warn" | "error" }> = [];
    if (!trackingLatest) {
      alerts.push({ key: "no_signal", label: "Sin señal de tracking", level: "warn" });
    }
    if (trackingAgeMs != null && trackingAgeMs > TRACKING_STALE_MS) {
      alerts.push({
        key: "tracking_stale",
        label: `Tracking desactualizado (${formatTrackingAge(trackingAgeMs)})`,
        level: "warn",
      });
    }
    if (selectedPlannedPolyline.length < 2) {
      alerts.push({ key: "no_geometry", label: "Ruta sin geometría", level: "error" });
    }
    if (
      routeDistanceDeviation != null &&
      routeDistanceDeviation > OFF_ROUTE_THRESHOLD_METERS
    ) {
      alerts.push({
        key: "off_route",
        label: `Fuera de ruta (${Math.round(routeDistanceDeviation)}m)`,
        level: "error",
      });
    }
    return alerts;
  }, [trackingLatest, trackingAgeMs, selectedPlannedPolyline.length, routeDistanceDeviation]);
  const trackingTelemetry = useMemo(() => {
    return {
      lastPingLabel:
        trackingAgeMs == null ? "Sin datos" : `hace ${formatTrackingAge(trackingAgeMs)}`,
      speedLabel:
        latestTrackingSample?.speedKmh != null
          ? `${Math.round(latestTrackingSample.speedKmh)} km/h`
          : "Sin datos",
      headingLabel:
        latestTrackingSample?.heading != null
          ? `${Math.round(latestTrackingSample.heading)}°`
          : "Sin datos",
    };
  }, [latestTrackingSample?.heading, latestTrackingSample?.speedKmh, trackingAgeMs]);

  const handleViewportChange = useCallback((routeId: string, viewport: RouteViewport) => {
    setRouteViewportsById((prev) => {
      const current = prev[routeId];
      if (
        current &&
        current.zoom === viewport.zoom &&
        Math.abs(current.center[0] - viewport.center[0]) < 1e-6 &&
        Math.abs(current.center[1] - viewport.center[1]) < 1e-6
      ) {
        return prev;
      }
      return { ...prev, [routeId]: viewport };
    });
  }, []);
  const handleRouteStatusFilterChange = useCallback(
    (next: RouteStatusFilter) => {
      setRouteStatusFilter(next);
      const nextFilteredRoutes =
        next === "all"
          ? routes
          : routes.filter((route) => statusToFilter(route.status) === next);
      setSelectedRouteId((prev) => {
        if (prev && nextFilteredRoutes.some((route) => route.id === prev)) {
          return prev;
        }
        return nextFilteredRoutes[0]?.id ?? null;
      });
    },
    [routes]
  );

  const handleRecenterRoute = () => {
    if (!effectiveSelectedRouteId) return;
    setFitSignal((prev) => prev + 1);
  };

  const handleFocusMyLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Geolocalización no disponible en este navegador.");
      return;
    }

    setIsLocatingUser(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setFocusUserSignal((prev) => prev + 1);
        setIsLocatingUser(false);
      },
      () => {
        setLocationError("No se pudo obtener tu ubicación.");
        setIsLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  const handleFocusTruck = () => {
    if (!selectedRoute) return;
    setFocusTrackingSignal((prev) => prev + 1);
  };

  const handleToggleFollowTruck = () => {
    setFollowTruck((prev) => !prev);
  };

  const handleRefreshTrackingNow = () => {
    if (!effectiveSelectedRouteId || isLoadingTracking) return;
    setTrackingRefreshSignal((prev) => prev + 1);
  };

  const handleToggleFullscreen = async () => {
    const mapCard = document.getElementById("routes-map-card");
    if (!mapCard) return;

    try {
      if (!document.fullscreenElement) {
        await mapCard.requestFullscreen();
        return;
      }
      await document.exitFullscreen();
    } catch {
      // no-op
    }
  };

  const startLongPressHint = (hint: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      setActiveControlHint(hint);
    }, 450);
  };

  const clearLongPressHint = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setActiveControlHint(null);
  };

  const bumpResizeSignal = useCallback(() => {
    setResizeSignal((prev) => prev + 1);
  }, []);

  const lastTrackingSyncLabel = useMemo(() => {
    if (!lastTrackingSyncAt) return null;
    return new Date(lastTrackingSyncAt).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastTrackingSyncAt]);
  const estimatedPollDelayLabel = useMemo(() => {
    const isHidden =
      typeof document !== "undefined" && document.visibilityState !== "visible";
    const delayMs = getTrackingPollDelay(
      isHidden,
      trackingErrorCount,
      trackingLastErrorStatus,
      isOnline
    );
    return `${Math.round(delayMs / 1000)}s`;
  }, [trackingErrorCount, trackingLastErrorStatus, isOnline]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const element = document.fullscreenElement;
      setIsFullscreen(!!element && element.id === "routes-map-card");
      bumpResizeSignal();
      setTimeout(() => bumpResizeSignal(), 220);
    };
    const onWindowResize = () => {
      bumpResizeSignal();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("resize", onWindowResize);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("resize", onWindowResize);
    };
  }, [bumpResizeSignal]);

  useEffect(() => {
    bumpResizeSignal();
    const timeoutId = setTimeout(() => {
      bumpResizeSignal();
    }, 180);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isRoutesPanelVisible, bumpResizeSignal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1280px)");
    const syncCollapseCapability = () => {
      setCanCollapseRoutesPanel(media.matches);
    };
    syncCollapseCapability();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", syncCollapseCapability);
      return () => {
        media.removeEventListener("change", syncCollapseCapability);
      };
    }

    media.addListener(syncCollapseCapability);
    return () => {
      media.removeListener(syncCollapseCapability);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isTypingContext) return;

      const key = event.key.toLowerCase();
      if (key === "escape") {
        if (showMapOptions) {
          setShowMapOptions(false);
          event.preventDefault();
        }
        return;
      }
      if (key === "o") {
        setShowMapOptions((prev) => !prev);
        event.preventDefault();
        return;
      }
      if (key === "f") {
        if (trackingLatest) {
          setFollowTruck((prev) => !prev);
          event.preventDefault();
        }
        return;
      }
      if (key === "r") {
        if (effectiveSelectedRouteId) {
          setFitSignal((prev) => prev + 1);
          event.preventDefault();
        }
        return;
      }
      if (key === "t") {
        if (selectedRoute) {
          setFocusTrackingSignal((prev) => prev + 1);
          event.preventDefault();
        }
        return;
      }
      if (key === "m") {
        handleFocusMyLocation();
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [
    showMapOptions,
    trackingLatest,
    effectiveSelectedRouteId,
    selectedRoute,
    handleFocusMyLocation,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedMapOptions = {
      showOnlySelectedRoute,
      showStops,
      showOriginDestinationMarkers,
      showPlannedLine,
      showTrackingLine,
      showRoutesPanel,
      routeStatusFilter,
      highDensityRoutes,
      baseMapStyle,
    };
    window.localStorage.setItem(MAP_OPTIONS_STORAGE_KEY, JSON.stringify(payload));
  }, [
    showOnlySelectedRoute,
    showStops,
    showOriginDestinationMarkers,
    showPlannedLine,
    showTrackingLine,
    showRoutesPanel,
    routeStatusFilter,
    highDensityRoutes,
    baseMapStyle,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      MAP_VIEWPORT_STORAGE_KEY,
      JSON.stringify(routeViewportsById)
    );
  }, [routeViewportsById]);

  // --------- UI ---------
  return (
    <div className="flex flex-col h-full w-full bg-white border border-gray-200 rounded-2xl shadow-sm">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-6 py-3 border-b border-gray-100 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </button>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
              Seguimiento
            </p>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              Mapa de rutas
            </h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs text-blue-700 border border-blue-100">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold shadow-sm">
              {summary.routes}
            </span>
            <span className="font-medium">
              {summary.routes === summary.totalRoutes
                ? "rutas"
                : `de ${summary.totalRoutes}`}
            </span>
          </div>

          {effectiveSelectedRouteId && (
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 border border-emerald-100">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              {`Puntos: ${summary.stopsCount}`}
            </div>
          )}

          {trackingHealthMeta && (
            <div
              className={`hidden md:flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${trackingHealthMeta.className}`}
            >
              <span className="font-medium">{trackingHealthMeta.label}</span>
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="flex-1 flex flex-col gap-3 xl:flex-row xl:gap-4 p-3 sm:p-4 md:p-5 min-h-[440px] bg-slate-50">
        {/* MAPA */}
        <div className="relative flex-1 flex flex-col gap-2">
          {canCollapseRoutesPanel && !isRoutesPanelVisible && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowRoutesPanel(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100"
                title="Mostrar rutas planificadas"
                aria-label="Mostrar rutas planificadas"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 pb-1 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {statusKpiItems.map((item) => {
                const isActive = routeStatusFilter === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleRouteStatusFilterChange(item.value)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      isActive ? item.activeClass : item.inactiveClass
                    }`}
                    aria-pressed={isActive}
                  >
                    <span>{item.label}</span>
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/90 px-1 text-[10px] text-gray-700 dark:bg-slate-700 dark:text-slate-100">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex w-full items-center gap-2 lg:w-[320px]">
              <input
                type="text"
                value={routeSearchQuery}
                onChange={(event) => setRouteSearchQuery(event.target.value)}
                placeholder="Buscar ruta, vehículo o conductor"
                className="h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
              {routeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRouteSearchQuery("")}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div
            id="routes-map-card"
            className="relative z-0 h-[48vh] min-h-[280px] max-h-[560px] sm:h-[54vh] md:h-[58vh] xl:h-full xl:max-h-none rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white"
          >
            <RoutesMapView
              routes={filteredRoutes}
              selectedRouteId={effectiveSelectedRouteId}
              onRouteClick={(routeId) => {
                setSelectedRouteId(routeId);
                setFitSignal((prev) => prev + 1);
              }}
              fitSignal={fitSignal}
              trackingPositions={trackingDisplay}
              userLocation={userLocation}
              focusUserSignal={focusUserSignal}
              focusTrackingSignal={focusTrackingSignal}
              followTracking={followTruck}
              showOnlySelectedRoute={showOnlySelectedRoute}
              showStops={showStops}
              showOriginDestinationMarkers={showOriginDestinationMarkers}
              showPlannedLine={showPlannedLine}
              showTrackingLine={showTrackingLine}
              baseMapStyle={baseMapStyle}
              routeViewportByRouteId={routeViewportsById}
              onRouteViewportChange={handleViewportChange}
              resizeSignal={resizeSignal}
            />

            {/* Panel flotante con info de la ruta seleccionada */}
            {selectedRoute && (
              <div className="pointer-events-none absolute left-2.5 top-2.5 z-[1110] w-[calc(100%-1.25rem)] max-w-[430px] sm:left-3 sm:top-3 sm:w-[min(calc(100%-1.5rem),370px)]">
                <div className="w-full overflow-hidden rounded-xl border border-slate-600/50 bg-slate-800/92 px-3 py-2 shadow-lg shadow-black/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wide text-slate-300">
                        Ruta seleccionada
                      </p>
                      <p className="truncate text-sm font-semibold text-white">
                        {selectedRoute.name || "Sin nombre"}
                      </p>
                      <div className="mt-1 flex flex-col gap-0.5 text-[11px] leading-4 text-slate-300">
                        <p className="truncate">
                          Vehículo:{" "}
                          <span className="font-medium text-slate-100">
                            {formatVehicleLabel(selectedRoute.vehicleId)}
                          </span>
                        </p>
                        <p className="truncate">
                          Conductor:{" "}
                          <span className="font-medium text-slate-100">
                            {formatDriverLabel(selectedRoute.driverId)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span
                      className={`ml-1 mt-0.5 inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                    <div>
                      <p className="text-slate-400">Último ping</p>
                      <p className="font-medium text-slate-100">{trackingTelemetry.lastPingLabel}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Velocidad</p>
                      <p className="font-medium text-slate-100">{trackingTelemetry.speedLabel}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Rumbo</p>
                      <p className="font-medium text-slate-100">{trackingTelemetry.headingLabel}</p>
                    </div>
                  </div>

                  {routeAlerts.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {routeAlerts.map((alert) => (
                        <span
                          key={alert.key}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 ${
                            alert.level === "error"
                              ? "border-red-500/40 bg-red-500/20 text-red-100"
                              : "border-amber-500/40 bg-amber-500/20 text-amber-100"
                          }`}
                        >
                          {alert.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-300">
                    {showPlannedLine && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-3 rounded-full bg-blue-500" />
                        <span>Planificada</span>
                      </div>
                    )}
                    {showTrackingLine && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" />
                        <span>Tracking real</span>
                      </div>
                    )}
                    {showStops && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-3 rounded-full bg-indigo-400" />
                        <span>Paradas</span>
                      </div>
                    )}
                    {showOriginDestinationMarkers && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-3 rounded-full bg-white/70" />
                        <span>Origen/Destino</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="absolute left-2.5 sm:left-3 bottom-3 sm:bottom-4 z-[1100]">
              <div className="grid grid-cols-4 grid-rows-3 gap-1">
                  <div className="group relative col-start-1 row-start-1">
                    <button
                      type="button"
                      onClick={handleToggleFollowTruck}
                      onTouchStart={() => startLongPressHint("follow")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      disabled={!trackingLatest}
                      title={`Seguir camión: ${followTruck ? "ON" : "OFF"}`}
                      aria-label={`Seguir camión: ${followTruck ? "ON" : "OFF"}`}
                      aria-pressed={followTruck}
                      className={`inline-flex h-10 w-10 max-[430px]:h-9 max-[430px]:w-9 items-center justify-center rounded-lg border shadow-sm backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 ${
                        followTruck
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-white/95 text-gray-700 hover:bg-white"
                      }`}
                    >
                      <Crosshair className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "follow" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {`Seguir camión: ${followTruck ? "ON" : "OFF"}`}
                    </span>
                  </div>

                  <div className="group relative col-start-1 row-start-2">
                    <button
                      type="button"
                      onClick={handleToggleFullscreen}
                      onTouchStart={() => startLongPressHint("fullscreen")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      title={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
                      aria-label={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
                      className="inline-flex h-10 w-10 max-[430px]:h-9 max-[430px]:w-9 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={`pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "fullscreen" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
                    </span>
                  </div>

                  <div className="group relative z-[1140] col-start-1 row-start-3">
                    <button
                      type="button"
                      onClick={() => setShowMapOptions((prev) => !prev)}
                      onTouchStart={() => startLongPressHint("options")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      title={`Opciones del mapa: ${showMapOptions ? "ON" : "OFF"}`}
                      aria-label={`Opciones del mapa: ${showMapOptions ? "ON" : "OFF"}`}
                      aria-pressed={showMapOptions}
                      aria-haspopup="dialog"
                      aria-expanded={showMapOptions}
                      aria-controls={optionsPanelId}
                      className={`inline-flex h-10 w-10 max-[430px]:h-9 max-[430px]:w-9 items-center justify-center rounded-lg border shadow-sm backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        showMapOptions
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white/95 text-gray-700 hover:bg-white"
                      }`}
                    >
                      <Layers className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "options" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      Opciones del mapa
                    </span>
                  </div>

                  <div className="group relative col-start-2 row-start-3">
                    <button
                      type="button"
                      onClick={handleRecenterRoute}
                      onTouchStart={() => startLongPressHint("recenter")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      disabled={!effectiveSelectedRouteId}
                      title="Recentrar ruta"
                      aria-label="Recentrar ruta"
                      className="inline-flex h-10 w-10 max-[430px]:h-9 max-[430px]:w-9 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RoutePath className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "recenter" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      Recentrar ruta
                    </span>
                  </div>

                  <div className="group relative col-start-3 row-start-3">
                    <button
                      type="button"
                      onClick={handleFocusTruck}
                      onTouchStart={() => startLongPressHint("truck")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      disabled={!selectedRoute}
                      title="Centrar camión"
                      aria-label="Centrar camión"
                      className="inline-flex h-10 w-10 max-[430px]:h-9 max-[430px]:w-9 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Truck className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "truck" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      Centrar camión
                    </span>
                  </div>

                  <div className="group relative col-start-4 row-start-3">
                    <button
                      type="button"
                      onClick={handleFocusMyLocation}
                      onTouchStart={() => startLongPressHint("location")}
                      onTouchEnd={clearLongPressHint}
                      onTouchCancel={clearLongPressHint}
                      onTouchMove={clearLongPressHint}
                      onBlur={clearLongPressHint}
                      disabled={isLocatingUser}
                      title={isLocatingUser ? "Ubicando..." : "Mi ubicación"}
                      aria-label={isLocatingUser ? "Ubicando..." : "Mi ubicación"}
                      className="inline-flex h-10 w-10 max-[430px]:h-9 max-[430px]:w-9 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LocateFixed className="h-4 w-4" />
                    </button>
                    <span
                      className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-opacity duration-150 group-hover:opacity-100 ${
                        activeControlHint === "location" ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {isLocatingUser ? "Ubicando..." : "Mi ubicación"}
                    </span>
                  </div>
              </div>
            </div>

            {showMapOptions && (
              <div
                id={optionsPanelId}
                role="region"
                aria-label="Opciones del mapa"
                className="absolute z-[1120] overflow-y-auto rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur left-3 right-3 bottom-16 top-28 sm:left-[12rem] sm:right-auto sm:bottom-8 sm:top-32 sm:w-64 dark:border-slate-700 dark:bg-slate-800/95"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                    Opciones
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMapOptions(false)}
                    className="rounded-md px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700 dark:text-slate-200">Mapa base</span>
                    <select
                      value={baseMapStyle}
                      onChange={(event) => setBaseMapStyle(event.target.value as MapBaseStyle)}
                      className="h-7 rounded-md border border-gray-200 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    >
                      {MAP_BASE_STYLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700 dark:text-slate-200">Solo ruta seleccionada</span>
                    <button
                      type="button"
                      onClick={() => setShowOnlySelectedRoute((prev) => !prev)}
                      aria-pressed={showOnlySelectedRoute}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        showOnlySelectedRoute
                          ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                          : "border-gray-200 bg-white text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {showOnlySelectedRoute ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700 dark:text-slate-200">Mostrar paradas</span>
                    <button
                      type="button"
                      onClick={() => setShowStops((prev) => !prev)}
                      aria-pressed={showStops}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        showStops
                          ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                          : "border-gray-200 bg-white text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {showStops ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700 dark:text-slate-200">Origen/Destino</span>
                    <button
                      type="button"
                      onClick={() => setShowOriginDestinationMarkers((prev) => !prev)}
                      aria-pressed={showOriginDestinationMarkers}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        showOriginDestinationMarkers
                          ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                          : "border-gray-200 bg-white text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {showOriginDestinationMarkers ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700 dark:text-slate-200">Ruta planificada</span>
                    <button
                      type="button"
                      onClick={() => setShowPlannedLine((prev) => !prev)}
                      aria-pressed={showPlannedLine}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        showPlannedLine
                          ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                          : "border-gray-200 bg-white text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {showPlannedLine ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-700 dark:text-slate-200">Tracking real</span>
                    <button
                      type="button"
                      onClick={() => setShowTrackingLine((prev) => !prev)}
                      aria-pressed={showTrackingLine}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        showTrackingLine
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                          : "border-gray-200 bg-white text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {showTrackingLine ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshTrackingNow}
                  disabled={!effectiveSelectedRouteId || isLoadingTracking}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTracking ? "animate-spin" : ""}`} />
                  {isLoadingTracking ? "Actualizando..." : "Actualizar tracking ahora"}
                </button>

                {lastTrackingSyncLabel && (
                  <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-300">
                    Última actualización: {lastTrackingSyncLabel}
                  </p>
                )}

                {DEBUG_MAP_ENABLED && (
                  <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/70 p-2.5 text-[11px] text-indigo-900 dark:border-indigo-700/60 dark:bg-indigo-900/30 dark:text-indigo-100">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-200">
                      Observabilidad (debug)
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      <p>
                        Estado red:{" "}
                        <span className="font-semibold">
                          {isOnline ? "online" : "offline"}
                        </span>
                      </p>
                      <p>
                        Polling estimado:{" "}
                        <span className="font-semibold">{estimatedPollDelayLabel}</span>
                      </p>
                      <p>
                        Requests:{" "}
                        <span className="font-semibold">{trackingDiagnostics.requests}</span>
                        {" · "}OK:{" "}
                        <span className="font-semibold">{trackingDiagnostics.successes}</span>
                        {" · "}Error:{" "}
                        <span className="font-semibold">{trackingDiagnostics.errors}</span>
                      </p>
                      <p>
                        Último estado:{" "}
                        <span className="font-semibold">
                          {trackingDiagnostics.lastStatus ?? "n/a"}
                        </span>
                      </p>
                      <p>
                        Latencia:{" "}
                        <span className="font-semibold">
                          {trackingDiagnostics.lastLatencyMs == null
                            ? "n/a"
                            : `${trackingDiagnostics.lastLatencyMs}ms`}
                        </span>
                        {" · "}Promedio:{" "}
                        <span className="font-semibold">
                          {trackingDiagnostics.avgLatencyMs == null
                            ? "n/a"
                            : `${trackingDiagnostics.avgLatencyMs}ms`}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {isLoading && (
              <div role="status" aria-live="polite" className="absolute right-3 top-3 z-[1040] rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] text-blue-700 shadow-sm">
                Actualizando rutas...
              </div>
            )}

            {isLoadingTracking && (
              <div role="status" aria-live="polite" className="absolute right-3 top-12 z-[1040] rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700 shadow-sm">
                Actualizando tracking...
              </div>
            )}

            {locationError && (
              <div className="absolute left-3 right-3 sm:right-auto sm:max-w-xs bottom-28 z-[1060] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 shadow-sm">
                {locationError}
              </div>
            )}

            {!isLoading && error && routes.length === 0 && (
              <div className="absolute inset-0 z-[1060] flex items-center justify-center bg-white/80 text-sm text-red-500">
                {error}
              </div>
            )}

            {!isLoading && error && routes.length > 0 && (
              <div className="absolute left-3 bottom-3 z-[1060] rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] text-red-700 shadow-sm">
                {error}
              </div>
            )}

          </div>
        </div>

        {/* SIDEBAR LISTA DE RUTAS */}
        {isRoutesPanelVisible && (
          <aside
            className={`w-full xl:w-72 2xl:w-80 flex-shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-3 ${
              highDensityRoutes ? "p-2.5 md:p-3" : "p-3 md:p-4"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">
                  Rutas planificadas
                </h2>
                <span className="text-[11px] text-gray-400">
                  {summary.routes} visibles · {summary.totalRoutes} total
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHighDensityRoutes((prev) => !prev)}
                  className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition ${
                    highDensityRoutes
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                  title={`Alta densidad: ${highDensityRoutes ? "ON" : "OFF"}`}
                  aria-label={`Alta densidad: ${highDensityRoutes ? "ON" : "OFF"}`}
                  aria-pressed={highDensityRoutes}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {highDensityRoutes ? "Compacto" : "Cómodo"}
                  </span>
                </button>
                {canCollapseRoutesPanel && (
                  <button
                    type="button"
                    onClick={() => setShowRoutesPanel(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                    title="Ocultar rutas planificadas"
                    aria-label="Ocultar rutas planificadas"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {filteredRoutes.length === 0 && !isLoading && !error && (
              <p className="text-xs text-gray-500">
                {routeSearchQuery
                  ? "No hay rutas que coincidan con la búsqueda."
                  : "No hay rutas para este filtro."}
              </p>
            )}

            <div
              className={`overflow-auto pr-1 ${
                highDensityRoutes
                  ? "space-y-1.5 max-h-[320px] sm:max-h-[420px] lg:max-h-[560px]"
                  : "space-y-2 max-h-[260px] sm:max-h-[320px] lg:max-h-[420px]"
              }`}
            >
              {filteredRoutes.map((route) => {
                const isSelected = route.id === effectiveSelectedRouteId;
                const meta = getStatusMeta(route.status);

                return (
                  <button
                    key={route.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedRouteId(route.id);
                      setFitSignal((prev) => prev + 1);
                    }}
                    className={`w-full text-left rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                      highDensityRoutes ? "px-2.5 py-2 text-[11px]" : "px-3 py-2.5 text-xs md:text-sm"
                    } ${
                      isSelected
                        ? "border-blue-300 bg-blue-50 text-blue-900 shadow-xs"
                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/70 text-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`truncate font-semibold ${highDensityRoutes ? "text-xs" : ""}`}>
                          {route.name || "Ruta sin nombre"}
                        </p>
                        <p className={`truncate text-gray-500 ${highDensityRoutes ? "text-[10px]" : "text-[11px]"}`}>
                          Vehículo:{" "}
                          <span className="font-medium">
                            {formatVehicleLabel(route.vehicleId)}
                          </span>{" "}
                          · Conductor:{" "}
                          <span className="font-medium">
                            {formatDriverLabel(route.driverId)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 inline-flex items-center rounded-full border font-medium ${highDensityRoutes ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"} ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default MapView;
