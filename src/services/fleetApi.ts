// src/services/fleetApi.ts
import type { ApiRequestOptions } from "@/Context/AuthContext";

/**
 * ApiFetcher genérico que ya usas en tu AuthContext
 */
export type ApiFetcher = <T>(
  path: string,
  options?: ApiRequestOptions
) => Promise<T>;

/* ============================================================
 *  DTOs 1:1 CON LA API (lo que devuelve tu backend)
 * ========================================================== */

/**
 * Coincide con el JSON real de /api/Routes
 */
export interface RouteApiDto {
  id: string;
  vehicleId: string;
  vehiclePlate?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  driverId: string;
  name: string;
  origin: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    Latitude?: number;
    Longitude?: number;
    name?: string;
    Name?: string;
  };
  destination: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    Latitude?: number;
    Longitude?: number;
    name?: string;
    Name?: string;
  };
  points: RawRoutePoint[];
  cargoDescription?: string | null;
  plannedStart?: string | null; // ISO
  plannedEnd?: string | null;   // ISO
  startedAt?: string | null; // inicio real de la ruta
  endedAt?: string | null; // cierre real de la ruta
  createdAtUtc?: string | null; // fecha real de creación; rutas antiguas pueden no tenerla
  status: number;       // RouteStatus en el backend
  isActive: boolean;
}

/**
 * Coincide con GET /api/Routes/{routeId}/positions
 */
export interface RoutePositionApiDto {
  id: string;
  routeId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  speedKmh: number;
  heading: number;
}

/**
 * Ajusta esto si tu backend devuelve campos extra en /api/Vehicles
 */
export interface VehicleApiDto {
  id: string;
  name: string;
  model: string;
  brand: string;
  description?: string | null;
  plate: string;        // o plateNumber / licensePlate según tu API real
  status: number;       // VehicleStatus
  isActive: boolean;
}

/* ============================================================
 *  QUERY PARAMS Y HELPERS
 * ========================================================== */

export interface RouteQueryParams {
  status?: string;   // si luego quieres filtrar por status numérico, cambia a number
  vehicleId?: string;
  driverId?: string;
  onlyActive?: boolean;
}

const buildQueryString = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter(
    ([, value]) => typeof value === "string" && value.length > 0
  ) as Array<[string, string]>;

  if (entries.length === 0) return "";
  return `?${new URLSearchParams(Object.fromEntries(entries)).toString()}`;
};

/* ============================================================
 *  LLAMADAS A LA API
 * ========================================================== */

/**
 * GET /api/Routes
 */
export const fetchRoutes = (
  apiFetch: ApiFetcher,
  params: RouteQueryParams = {}
): Promise<RouteApiDto[]> => {
  const query = buildQueryString({
    status: params.status,
    vehicleId: params.vehicleId,
    driverId: params.driverId,
    onlyActive: params.onlyActive ? "true" : undefined,
  });

  return apiFetch<RouteApiDto[]>(`/Routes${query}`);
};

/**
 * GET /api/Routes/{routeId}/positions?from=&to=
 * from/to opcionales en ISO-8601
 */
export const fetchRoutePositions = (
  apiFetch: ApiFetcher,
  routeId: string,
  from?: string,
  to?: string
): Promise<RoutePositionApiDto[]> => {
  const query = buildQueryString({
    from,
    to,
  });

  return apiFetch<RoutePositionApiDto[]>(
    `/Routes/${routeId}/positions${query}`
  );
};

/**
 * GET /api/Vehicles
 */
export const fetchVehicles = (
  apiFetch: ApiFetcher
): Promise<VehicleApiDto[]> => {
  return apiFetch<VehicleApiDto[]>(`/Vehicles`);
};

/* ============================================================
 *  MODELO NORMALIZADO PARA EL MAPA
 *  (lo que consume directamente el MapView)
 * ========================================================== */

/**
 * Tipo fuerte y sencillo para el MapView.
 */
export interface RouteForMap {
  id: string;
  name: string;
  vehicleId: string;
  driverId: string;
  status: number;
  isActive: boolean;
  origin: { latitude: number; longitude: number; name?: string };
  destination: { latitude: number; longitude: number; name?: string };
  points: Array<{ latitude: number; longitude: number; name?: string }>;
}

interface RawRoutePoint {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  Latitude?: number;
  Longitude?: number;
  name?: string;
  Name?: string;
  operation?: number | string;
  Operation?: number | string;
  status?: number | string;
  Status?: number | string;
  evidence?: Array<{
    type?: string;
    content?: string;
    description?: string;
    createdAtUtc?: string;
  }>;
  Evidence?: Array<{
    type?: string;
    content?: string;
    description?: string;
    createdAtUtc?: string;
  }>;
}

type RouteApiDtoWithSerializedPoints = RouteApiDto & {
  pointsJson?: string;
  PointsJson?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRawRoutePoint = (value: unknown): value is RawRoutePoint =>
  isRecord(value);

const firstNumber = (...values: unknown[]): number => {
  const value = values.find((candidate) => typeof candidate === "number");
  return typeof value === "number" ? value : 0;
};

const normalizePoint = (
  raw: RawRoutePoint,
  fallbackName: string
): { latitude: number; longitude: number; name?: string } => ({
  latitude: firstNumber(raw.latitude, raw.lat, raw.Latitude),
  longitude: firstNumber(raw.longitude, raw.lng, raw.Longitude),
  name: raw.name ?? raw.Name ?? fallbackName,
});

const parsePoints = (
  dto: RouteApiDtoWithSerializedPoints
) => {
  if (Array.isArray(dto.points)) {
    return dto.points
      .filter(isRawRoutePoint)
      .map((point, idx) => normalizePoint(point, `Punto ${idx + 1}`));
  }
  const raw = dto.pointsJson ?? dto.PointsJson;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(isRawRoutePoint)
          .map((point, idx) => normalizePoint(point, `Punto ${idx + 1}`));
      }
    } catch {
      // ignore parse errors
    }
  }
  return [];
};

/**
 * Mapeador: API -> modelo para mapa
 */
export const mapRouteApiToRouteForMap = (dto: RouteApiDto): RouteForMap => ({
  id: dto.id,
  name: dto.name,
  vehicleId: dto.vehicleId,
  driverId: dto.driverId,
  status: dto.status,
  isActive: dto.isActive,
  origin: {
    latitude:
      firstNumber(dto.origin.latitude, dto.origin.lat, dto.origin.Latitude),
    longitude:
      firstNumber(dto.origin.longitude, dto.origin.lng, dto.origin.Longitude),
    name: dto.origin.name ?? dto.origin.Name,
  },
  destination: {
    latitude:
      firstNumber(dto.destination.latitude, dto.destination.lat, dto.destination.Latitude),
    longitude:
      firstNumber(dto.destination.longitude, dto.destination.lng, dto.destination.Longitude),
    name: dto.destination.name ?? dto.destination.Name,
  },
  points: parsePoints(dto),
});

/**
 * Helper para listas
 */
export const mapRoutesApiToRoutesForMap = (
  dtos: RouteApiDto[]
): RouteForMap[] => dtos.map(mapRouteApiToRouteForMap);

/* ============================================================
 *  ALIAS PARA COMPATIBILIDAD (si en el front usabas RouteDto, etc.)
 * ========================================================== */

export type RouteDto = RouteApiDto;
export type RoutePositionDto = RoutePositionApiDto;
export type VehicleDto = VehicleApiDto;
