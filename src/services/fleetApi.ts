import type { ApiRequestOptions } from "@/Context/AuthContext";

type ApiFetcher = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;

export interface RouteDto {
  id: string;
  name?: string;
  nombre?: string;
  description?: string;
  descripcion?: string;
  status?: string;
  estado?: string;
  vehicleId?: string;
  vehiculoId?: string;
  driverId?: string;
  conductorId?: string;
  driverName?: string;
  driverFullName?: string;
  cargo?: string;
  stops?: Array<Record<string, unknown>>;
  puntos?: Array<Record<string, unknown>>;
  originLatitude?: number | string;
  originLongitude?: number | string;
  destinationLatitude?: number | string;
  destinationLongitude?: number | string;
}

export interface RoutePositionDto {
  id?: string;
  latitude?: number | string;
  longitude?: number | string;
  latitud?: number | string;
  longitud?: number | string;
  lat?: number | string;
  lng?: number | string;
  recordedAt?: string;
  timestamp?: string;
}

export interface VehicleDto {
  id: string;
  name?: string;
  nombre?: string;
  description?: string;
  placa?: string;
  plateNumber?: string;
  licensePlate?: string;
  lastLatitude?: number | string;
  lastLongitude?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  driverId?: string;
  driverName?: string;
  driverFullName?: string;
  status?: string;
}

export interface RouteQueryParams {
  status?: string;
  vehicleId?: string;
  driverId?: string;
}

const buildQueryString = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter(
    ([, value]) => typeof value === "string" && value.length > 0
  ) as Array<[string, string]>;
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(Object.fromEntries(entries)).toString()}`;
};

export const fetchRoutes = (apiFetch: ApiFetcher, params: RouteQueryParams = {}) => {
  const query = buildQueryString({
    status: params.status,
    vehicleId: params.vehicleId,
    driverId: params.driverId,
  });
  return apiFetch<RouteDto[]>(`/routes${query}`);
};

export const fetchRoutePositions = (apiFetch: ApiFetcher, routeId: string) => {
  return apiFetch<RoutePositionDto[]>(`/routes/${routeId}/positions`);
};

export const fetchVehicles = (apiFetch: ApiFetcher) => {
  return apiFetch<VehicleDto[]>(`/vehicles`);
};
