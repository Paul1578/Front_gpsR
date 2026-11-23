"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

export interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  estado: "disponible" | "en_ruta" | "mantenimiento";
  ubicacionActual?: { lat: number; lng: number };
  teamId?: string;
  descripcion?: string;
  isActive?: boolean;
}

export type RouteEvidence =
  | {
      id: string;
      type: "image";
      content: string;
      description?: string;
      timestamp: string;
    }
  | { id: string; type: "note"; content: string; timestamp: string };

export type RoutePointOperation =
  "none" | "pickup" | "delivery" | "pickup_and_delivery";
export type RoutePointStatus =
  "pending" | "in_progress" | "completed" | "failed" | "skipped";

type NewRouteEvidence = RouteEvidence extends infer Evidence
  ? Evidence extends RouteEvidence
    ? Omit<Evidence, "id" | "timestamp">
    : never
  : never;

export interface Route {
  id: string;
  nombre: string;
  vehiculoId: string;
  vehiculoPlaca?: string;
  vehiculoMarca?: string;
  vehiculoModelo?: string;
  conductorId: string;
  carga: string;
  origen?: {
    lat: number;
    lng: number;
    nombre?: string;
    operation?: RoutePointOperation;
    status?: RoutePointStatus;
    evidence?: RouteEvidence[];
  };
  destino?: {
    lat: number;
    lng: number;
    nombre?: string;
    operation?: RoutePointOperation;
    status?: RoutePointStatus;
    evidence?: RouteEvidence[];
  };
  puntos: Array<{
    lat: number;
    lng: number;
    nombre?: string;
    operation?: RoutePointOperation;
    status?: RoutePointStatus;
    evidence?: RouteEvidence[];
  }>;
  // paradas intermedias
  estado: "pendiente" | "en_progreso" | "completada" | "cancelada";
  fechaCreacion: string;
  createdAtUtc?: string | null;
  fechaInicio?: string;
  fechaFin?: string;
  fechaInicioReal?: string;
  fechaFinReal?: string;
  teamId?: string;
  evidencias?: RouteEvidence[];
  notas?: string;
  isActive?: boolean;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  phoneNumber: string;
  isActive?: boolean;
  vehicleId?: string;
  userId?: string | null;
}

export interface RouteAssignmentVehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  estado: Vehicle["estado"];
}

export interface RouteAssignmentDriver {
  id: string;
  firstName: string;
  lastName: string;
  userId: string | null;
  isAvailable?: boolean;
}

interface FleetContextType {
  vehicles: Vehicle[];
  routes: Route[];
  drivers: Driver[];
  routeAssignmentVehicles: RouteAssignmentVehicle[];
  routeAssignmentDrivers: RouteAssignmentDriver[];
  loadErrors: string[];
  vehiclesLoading: boolean;
  routesLoading: boolean;
  routeAssignmentOptionsLoading: boolean;
  vehiclesLoaded: boolean;
  routesLoaded: boolean;
  routeAssignmentOptionsLoaded: boolean;
  retryFleetData: () => Promise<void>;

  addVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<ActionResult>;
  getInactiveVehicles: () => Promise<Vehicle[]>;
  reactivateVehicle: (id: string) => Promise<ActionResult>;
  updateVehicle: (
    id: string,
    vehicle: Partial<Vehicle>,
  ) => Promise<ActionResult>;
  deleteVehicle: (id: string) => Promise<ActionResult>;

  addRoute: (
    route: Omit<Route, "id" | "fechaCreacion">,
  ) => Promise<ActionResult>;
  updateRoute: (id: string, route: Partial<Route>) => Promise<ActionResult>;
  deleteRoute: (id: string) => Promise<ActionResult>;

  registerRoutePosition: (
    routeId: string,
    location: { lat: number; lng: number },
    meta?: { recordedAt?: string; speedKmh?: number; heading?: number },
  ) => Promise<ActionResult>;
  updateRoutePointStatus: (
    routeId: string,
    pointIndex: number,
    status: RoutePointStatus,
  ) => Promise<ActionResult>;
  addRoutePointEvidence: (
    routeId: string,
    pointIndex: number,
    evidence: NewRouteEvidence,
  ) => Promise<ActionResult>;

  getRoutesByDriver: (driverId: string) => Route[];
  getTeamVehicles: () => Vehicle[];
  getTeamRoutes: () => Route[];

  refreshDrivers: (onlyActive?: boolean) => Promise<void>;
  addDriver: (
    driver: Omit<Driver, "id" | "isActive" | "vehicleId">,
  ) => Promise<ActionResult>;
  updateDriver: (
    id: string,
    driver: Pick<Driver, "firstName" | "lastName" | "documentNumber" | "phoneNumber">,
  ) => Promise<ActionResult>;
  setDriverActive: (id: string, isActive: boolean) => Promise<ActionResult>;
  assignVehicleToDriver: (
    driverId: string,
    vehicleId: string,
  ) => Promise<ActionResult>;
  unassignVehicleFromDriver: (driverId: string) => Promise<ActionResult>;
  unlinkUserFromDriver: (driverId: string) => Promise<ActionResult>;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

type ApiVehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  description?: string;
  status?: number;
  isActive?: boolean;
};

type ApiRoutePoint = {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  name?: string;
  operation?: string | number;
  status?: string | number;
  evidence?: ApiPointEvidence[];
  Evidence?: ApiPointEvidence[];
};

type ApiPointEvidence = {
  type?: string;
  content?: string;
  description?: string;
  createdAtUtc?: string;
  CreatedAtUtc?: string;
};

type ApiRoute = {
  id: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  driverId: string;
  name: string;
  origin?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    name?: string;
    operation?: string | number;
    status?: string | number;
  };
  destination?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    name?: string;
    operation?: string | number;
    status?: string | number;
  };
  points: ApiRoutePoint[];
  cargoDescription?: string;
  plannedStart?: string;
  plannedEnd?: string;
  startedAt?: string;
  endedAt?: string;
  createdAtUtc?: string | null;
  status?: string | number;
  isActive?: boolean;
};

type ApiDriver = {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  phoneNumber: string;
  isActive?: boolean;
  vehicleId?: string;
  userId?: string | null;
};

type ApiRouteAssignmentOptions = {
  vehicles: Array<{
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    status: number;
  }>;
  drivers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    userId: string | null;
    isAvailable?: boolean;
  }>;
};

type ActionResult = { ok: boolean; message?: string };

type ApiRequestError = Error & {
  status?: number;
  data?: {
    message?: string;
    errors?: string[];
  };
};

type ApiRoutePointResponse = ApiRoutePoint & {
  Latitude?: number;
  Longitude?: number;
};

const resolveApiMessage = (error: unknown, fallback: string): string => {
  const requestError = error as ApiRequestError | null;
  const data = requestError?.data;
  const status = requestError?.status;
  const explicitMessage =
    data?.message ||
    (Array.isArray(data?.errors) ? data.errors.join(", ") : undefined) ||
    requestError?.message;

  if (status === 401) {
    return "Tu sesion expiro, inicia sesion nuevamente.";
  }

  return explicitMessage || fallback;
};

const statusNumberToState = (status?: number): Vehicle["estado"] => {
  switch (status) {
    case 1:
      return "en_ruta";
    case 2:
      return "mantenimiento";
    default:
      return "disponible";
  }
};

const stateToStatusNumber = (estado: Vehicle["estado"]): number => {
  if (estado === "en_ruta") return 1;
  if (estado === "mantenimiento") return 2;
  return 0;
};

const stateToApiStatusNumber = (estado?: Route["estado"]): number => {
  if (!estado) return 0; // Pending
  const key = estado.toLowerCase();
  if (key.includes("progreso")) return 1; // InProgress
  if (key.includes("complet")) return 2; // Completed
  if (key.includes("cancel")) return 3; // Cancelled
  return 0;
};

const pointStatusToApiNumber = (status: RoutePointStatus): number => ({
  pending: 0,
  in_progress: 1,
  completed: 2,
  failed: 3,
  skipped: 4,
})[status];

const pointOperationToApiNumber = (operation?: RoutePointOperation): number =>
  ({ none: 0, pickup: 1, delivery: 2, pickup_and_delivery: 3 })[
    operation ?? "none"
  ];

const mapApiVehicle = (apiVehicle: ApiVehicle): Vehicle => ({
  id: apiVehicle.id,
  placa: apiVehicle.plate,
  marca: apiVehicle.brand,
  modelo: apiVehicle.model,
  anio: apiVehicle.year,
  descripcion: apiVehicle.description,
  estado: statusNumberToState(apiVehicle.status),
  isActive: apiVehicle.isActive,
});

const mapApiRoute = (apiRoute: ApiRoute): Route => {
  const normalizeOperation = (
    operation?: string | number,
  ): RoutePointOperation => {
    if (typeof operation === "number")
      return operation === 1
        ? "pickup"
        : operation === 2
          ? "delivery"
          : operation === 3
            ? "pickup_and_delivery"
            : "none";
    const key = (operation ?? "")
      .toString()
      .toLowerCase()
      .replace(/[-\s]/g, "_");
    if (key.includes("pickup") || key.includes("recog"))
      return key.includes("delivery") || key.includes("entrega")
        ? "pickup_and_delivery"
        : "pickup";
    if (key.includes("delivery") || key.includes("entrega")) return "delivery";
    return "none";
  };
  const normalizePointStatus = (status?: string | number): RoutePointStatus => {
    if (typeof status === "number")
      return status === 1
        ? "in_progress"
        : status === 2
          ? "completed"
          : status === 3
            ? "failed"
            : status === 4
              ? "skipped"
              : "pending";
    const key = (status ?? "").toString().toLowerCase();
    if (key.includes("progress") || key.includes("curso")) return "in_progress";
    if (key.includes("complete") || key.includes("complet")) return "completed";
    if (key.includes("fail") || key.includes("fall")) return "failed";
    if (key.includes("skip") || key.includes("omit")) return "skipped";
    return "pending";
  };
  const normalizeStatus = (status?: string | number): Route["estado"] => {
    if (typeof status === "number") {
      if (status === 1) return "en_progreso";
      if (status === 2) return "completada";
      if (status === 3) return "cancelada";
      return "pendiente";
    }
    const key = (status ?? "").toString().toLowerCase();
    if (
      key.includes("progress") ||
      key.includes("curso") ||
      key.includes("progreso")
    )
      return "en_progreso";
    if (key.includes("complete") || key.includes("complet"))
      return "completada";
    if (key.includes("cancel")) return "cancelada";
    return "pendiente";
  };

  const allPoints =
    apiRoute.points?.map((point, idx) => {
      const responsePoint = point as ApiRoutePointResponse;
      const pointEvidence: RouteEvidence[] = (point.evidence ?? point.Evidence ?? []).map(
        (item, evidenceIndex) => {
          const timestamp = item.createdAtUtc ?? item.CreatedAtUtc ?? "";
          const id = `${apiRoute.id}-${idx}-${evidenceIndex}-${timestamp}`;
          return item.type === "image"
            ? {
                id,
                type: "image" as const,
                content: item.content ?? "",
                description: item.description,
                timestamp,
              }
            : { id, type: "note" as const, content: item.content ?? "", timestamp };
        },
      );
      return {
        lat: point.latitude ?? responsePoint.Latitude ?? point.lat ?? 0,
        lng: point.longitude ?? responsePoint.Longitude ?? point.lng ?? 0,
        nombre: point.name ?? `Punto ${idx + 1}`,
        operation: normalizeOperation(point.operation),
        status: normalizePointStatus(point.status),
        evidence: pointEvidence,
      };
    }) ?? [];
  const puntos = allPoints.length >= 2 ? allPoints.slice(1, -1) : [];
  const evidencias = allPoints.flatMap((point) => point.evidence ?? []);

  return {
    id: apiRoute.id,
    nombre: apiRoute.name,
    vehiculoId: apiRoute.vehicleId,
    vehiculoPlaca: apiRoute.vehiclePlate,
    vehiculoMarca: apiRoute.vehicleBrand,
    vehiculoModelo: apiRoute.vehicleModel,
    conductorId: apiRoute.driverId,
    carga: apiRoute.cargoDescription ?? "",
    origen: allPoints[0]
      ? { ...allPoints[0] }
      : apiRoute.origin
        ? {
            lat: apiRoute.origin.lat ?? apiRoute.origin.latitude ?? 0,
            lng: apiRoute.origin.lng ?? apiRoute.origin.longitude ?? 0,
            nombre: apiRoute.origin.name,
            operation: normalizeOperation(apiRoute.origin.operation),
            status: normalizePointStatus(apiRoute.origin.status),
          }
        : undefined,
    destino: allPoints.length > 1
      ? { ...allPoints[allPoints.length - 1] }
      : apiRoute.destination
        ? {
            lat: apiRoute.destination.lat ?? apiRoute.destination.latitude ?? 0,
            lng: apiRoute.destination.lng ?? apiRoute.destination.longitude ?? 0,
            nombre: apiRoute.destination.name,
            operation: normalizeOperation(apiRoute.destination.operation),
            status: normalizePointStatus(apiRoute.destination.status),
          }
        : undefined,
    puntos,
    evidencias,
    estado: normalizeStatus(apiRoute.status),
    fechaCreacion: apiRoute.createdAtUtc ?? "",
    createdAtUtc: apiRoute.createdAtUtc ?? null,
    fechaInicio: apiRoute.plannedStart,
    fechaFin: apiRoute.plannedEnd,
    fechaInicioReal: apiRoute.startedAt,
    fechaFinReal: apiRoute.endedAt,
    isActive: apiRoute.isActive,
  };
};

const mapApiDriver = (apiDriver: ApiDriver): Driver => ({
  id: apiDriver.id,
  firstName: apiDriver.firstName,
  lastName: apiDriver.lastName,
  documentNumber: apiDriver.documentNumber,
  phoneNumber: apiDriver.phoneNumber,
  isActive: apiDriver.isActive,
  vehicleId: apiDriver.vehicleId,
  userId: apiDriver.userId,
});

const toApiRoutePayload = (route: Partial<Route>) => {
  const operationToNumber = (operation?: RoutePointOperation) =>
    operation === "pickup"
      ? 1
      : operation === "delivery"
        ? 2
        : operation === "pickup_and_delivery"
          ? 3
          : 0;
  const pointStatusToNumber = (status?: RoutePointStatus) =>
    status === "in_progress"
      ? 1
      : status === "completed"
        ? 2
        : status === "failed"
          ? 3
          : status === "skipped"
            ? 4
            : 0;
  const toApiPoint = (
    point:
      | {
          lat?: number;
          lng?: number;
          nombre?: string;
          operation?: RoutePointOperation;
          status?: RoutePointStatus;
        }
      | undefined,
    fallbackName: string,
  ) =>
    point
      ? {
          lat: Number(point.lat ?? 0),
          lng: Number(point.lng ?? 0),
          name: point.nombre ?? fallbackName,
          operation: operationToNumber(point.operation),
          status: pointStatusToNumber(point.status),
        }
      : undefined;

  const stops =
    route.puntos?.map((p, idx) => ({
      lat: Number(p.lat),
      lng: Number(p.lng),
      name: p.nombre ?? `Parada ${idx + 1}`,
      operation: operationToNumber(p.operation),
      status: pointStatusToNumber(p.status),
    })) ?? [];

  // backend espera points: incluye todas las paradas (origen/destino opcional);
  // enviamos origen + paradas + destino para no perder los puntos.
  const points: Array<{
    lat: number;
    lng: number;
    name?: string;
    operation: number;
    status: number;
  }> = [];
  const originPoint = toApiPoint(route.origen, "Origen");
  if (originPoint) points.push(originPoint);
  points.push(...stops);
  const destinationPoint = toApiPoint(route.destino, "Destino");
  if (destinationPoint) points.push(destinationPoint);

  const plannedStart = route.fechaInicio ?? new Date().toISOString();
  const plannedEnd =
    route.fechaFin ??
    new Date(new Date(plannedStart).getTime() + 60 * 60 * 1000).toISOString();

  return {
    vehicleId: route.vehiculoId,
    driverId: route.conductorId,
    name: route.nombre,
    origin: toApiPoint(route.origen, "Origen"),
    destination: toApiPoint(route.destino, "Destino"),
    points,
    cargoDescription: route.carga,
    plannedStart,
    plannedEnd,
    status: stateToApiStatusNumber(route.estado),
    isActive: true,
  };
};

export function FleetProvider({ children }: { children: ReactNode }) {
  const { apiFetch, isAuthenticated, isLoadingUser, user } = useAuth();
  const userRole = user?.role;
  const ownerIdRef = useRef<string | null>(user?.id ?? null);
  const ownerSessionVersionRef = useRef(0);
  const ownerRequestControllerRef = useRef(new AbortController());
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routeAssignmentVehicles, setRouteAssignmentVehicles] = useState<RouteAssignmentVehicle[]>([]);
  const [routeAssignmentDrivers, setRouteAssignmentDrivers] = useState<RouteAssignmentDriver[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routeAssignmentOptionsLoading, setRouteAssignmentOptionsLoading] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [routeAssignmentOptionsLoaded, setRouteAssignmentOptionsLoaded] = useState(false);
  const driversRequestSequence = useRef(0);
  const [fleetOwnerId, setFleetOwnerId] = useState<string | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const setResourceError = useCallback((resource: string, failed: boolean) =>
    setLoadErrors((current) => failed
      ? current.includes(resource) ? current : [...current, resource]
      : current.filter((item) => item !== resource)), []);

  useLayoutEffect(() => {
    ownerIdRef.current = user?.id ?? null;
    ownerSessionVersionRef.current += 1;
    driversRequestSequence.current += 1;
    const previousController = ownerRequestControllerRef.current;
    ownerRequestControllerRef.current = new AbortController();
    previousController.abort();
    return () => ownerRequestControllerRef.current.abort();
  }, [user?.id, user?.role]);

  const captureOwnerSession = useCallback(() => ({
    ownerId: ownerIdRef.current,
    version: ownerSessionVersionRef.current,
  }), []);
  const isCurrentOwnerSession = useCallback((session: ReturnType<typeof captureOwnerSession>) =>
    session.ownerId !== null &&
    session.ownerId === ownerIdRef.current &&
    session.version === ownerSessionVersionRef.current, []);

  const apiFetchForOwner = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const session = captureOwnerSession();
    const ownerSignal = ownerRequestControllerRef.current.signal;
    const requestController = new AbortController();
    const abortRequest = () => requestController.abort();
    if (ownerSignal.aborted || options.signal?.aborted) abortRequest();
    else {
      ownerSignal.addEventListener("abort", abortRequest, { once: true });
      options.signal?.addEventListener("abort", abortRequest, { once: true });
    }

    try {
      const result = await apiFetch<T>(path, { ...options, signal: requestController.signal });
      if (!isCurrentOwnerSession(session)) {
        const error = new Error("Fleet response belongs to an inactive account session.");
        error.name = "AbortError";
        throw error;
      }
      return result;
    } finally {
      ownerSignal.removeEventListener("abort", abortRequest);
      options.signal?.removeEventListener("abort", abortRequest);
    }
  }, [apiFetch, captureOwnerSession, isCurrentOwnerSession]);

  useEffect(() => {
    setVehicles([]);
    setRoutes([]);
    setDrivers([]);
    setRouteAssignmentVehicles([]);
    setRouteAssignmentDrivers([]);
    setLoadErrors([]);
    setVehiclesLoading(!!userRole && !["chofer", "usuario", "logistica"].includes(userRole));
    setRoutesLoading(!!userRole && userRole !== "usuario");
    setRouteAssignmentOptionsLoading(!!userRole && ["gerente", "manager", "logistica"].includes(userRole));
    setVehiclesLoaded(false);
    setRoutesLoaded(false);
    setRouteAssignmentOptionsLoaded(false);
    setFleetOwnerId(user?.id ?? null);
  }, [user?.id, userRole]);

  const isAuthError = useCallback((error: unknown) => {
    if ((error as { name?: string } | null)?.name === "AbortError") return true;
    const status = (error as { status?: number } | null)?.status;
    return status === 401 || status === 403;
  }, []);

  const refreshRouteAssignmentOptions = useCallback(async () => {
    if (!apiFetch || !user || !["gerente", "manager", "logistica"].includes(user.role)) return;
    setRouteAssignmentOptionsLoading(true);
    try {
      const options = await apiFetchForOwner<ApiRouteAssignmentOptions>("/Routes/assignment-options");
      setRouteAssignmentVehicles(options.vehicles.map((vehicle) => ({
        id: vehicle.id,
        placa: vehicle.plate,
        marca: vehicle.brand,
        modelo: vehicle.model,
        anio: vehicle.year,
        estado: statusNumberToState(vehicle.status),
      })));
      setRouteAssignmentDrivers(options.drivers);
      setResourceError("opciones de asignación", false);
      setRouteAssignmentOptionsLoaded(true);
    } catch (error) {
      if (!isAuthError(error)) {
        setResourceError("opciones de asignación", true);
        setRouteAssignmentOptionsLoaded(true);
      }
      throw error;
    } finally {
      setRouteAssignmentOptionsLoading(false);
    }
  }, [apiFetch, apiFetchForOwner, isAuthError, setResourceError, user]);

  useEffect(() => {
    if (!apiFetch || isLoadingUser || !isAuthenticated || !user || !["gerente", "manager", "logistica"].includes(user.role)) return;
    void refreshRouteAssignmentOptions().catch((error) => {
      if (!isAuthError(error)) console.error("Error cargando opciones de asignación", error);
    });
  }, [apiFetch, isAuthenticated, isAuthError, isLoadingUser, refreshRouteAssignmentOptions, user]);

  // ---------------- VEHICLES ----------------
  useEffect(() => {
    const loadVehicles = async () => {
      if (!apiFetch || isLoadingUser || !isAuthenticated) return;
      if (["chofer", "usuario", "logistica"].includes(user?.role ?? "")) {
        setVehiclesLoading(false);
        setVehiclesLoaded(true);
        return;
      }
      const ownerSession = captureOwnerSession();
      setVehiclesLoading(true);
      try {
        const data = await apiFetchForOwner<ApiVehicle[]>("/Vehicles");
        const active = data.filter((vehicle) => vehicle.isActive !== false);
        setVehicles(active.map(mapApiVehicle));
        setResourceError("vehículos", false);
        setVehiclesLoaded(true);
      } catch (error) {
        if (isAuthError(error)) return;
        setResourceError("vehículos", true);
        setVehiclesLoaded(true);
        console.error("Error cargando vehículos desde API", error);
      } finally {
        if (isCurrentOwnerSession(ownerSession)) setVehiclesLoading(false);
      }
    };
    void loadVehicles();
  }, [apiFetch, apiFetchForOwner, captureOwnerSession, isAuthenticated, isAuthError, isCurrentOwnerSession, isLoadingUser, setResourceError, user?.role]);

  const addVehicle = async (
    vehicle: Omit<Vehicle, "id">,
  ): Promise<ActionResult> => {
    try {
      const payload = {
        plate: vehicle.placa,
        brand: vehicle.marca,
        model: vehicle.modelo,
        year: vehicle.anio,
        description: vehicle.descripcion ?? "",
      };

      const created = await apiFetchForOwner<ApiVehicle>("/Vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const mapped = mapApiVehicle(created);
      const updated = [...vehicles, mapped];

      setVehicles(updated);

      return { ok: true, message: "Vehiculo registrado correctamente" };
    } catch (error) {
      console.error("Error al crear vehiculo:", error);
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo crear el vehiculo"),
      };
    }
  };

  const updateVehicle = async (
    id: string,
    vehicleData: Partial<Vehicle>,
  ): Promise<ActionResult> => {
    const current = vehicles.find((v) => v.id === id);
    let detailsSaved = false;
    try {
      const nextEstado = vehicleData.estado ?? current?.estado;

      if (
        vehicleData.placa ||
        vehicleData.marca ||
        vehicleData.modelo ||
        vehicleData.anio ||
        vehicleData.descripcion
      ) {
        const payload = {
          plate: vehicleData.placa ?? current?.placa ?? "",
          brand: vehicleData.marca ?? current?.marca ?? "",
          model: vehicleData.modelo ?? current?.modelo ?? "",
          year: vehicleData.anio ?? current?.anio ?? new Date().getFullYear(),
          description: vehicleData.descripcion ?? current?.descripcion ?? "",
        };

        await apiFetchForOwner(`/Vehicles/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        detailsSaved = true;
        setVehicles((previous) => previous.map((item) =>
          item.id === id
            ? { ...item, ...vehicleData, estado: current?.estado ?? item.estado }
            : item,
        ));
      }

      if (nextEstado && current?.estado !== nextEstado) {
        await apiFetchForOwner(`/Vehicles/${id}/status`, {
          method: "PUT",
          body: JSON.stringify({ status: stateToStatusNumber(nextEstado) }),
        });
      }

      const updatedVehicles = vehicles.map((v) =>
        v.id === id ? { ...v, ...vehicleData } : v,
      );

      setVehicles(updatedVehicles);

      return { ok: true, message: "Vehiculo actualizado" };
    } catch (error) {
      console.error("Error al actualizar vehiculo:", error);
      if (detailsSaved) {
        return {
          ok: false,
          message: `Los datos del vehículo se guardaron, pero no se pudo cambiar su estado. ${resolveApiMessage(error, "Inténtalo nuevamente.")}`,
        };
      }
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo actualizar el vehiculo"),
      };
    }
  };

  const deleteVehicle = async (id: string): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Vehicles/${id}`, { method: "DELETE" });

      const updatedVehicles = vehicles.filter((v) => v.id !== id);
      setVehicles(updatedVehicles);

      return { ok: true, message: "Vehiculo eliminado" };
    } catch (error) {
      console.error("Error al eliminar vehiculo:", error);
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo eliminar el vehiculo"),
      };
    }
  };

  const getInactiveVehicles = async (): Promise<Vehicle[]> => {
    try {
      const data = await apiFetchForOwner<ApiVehicle[]>("/Vehicles?onlyActive=false");
      return data.filter((vehicle) => vehicle.isActive === false).map(mapApiVehicle);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const reactivateVehicle = async (id: string): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Vehicles/${id}/reactivate`, { method: "POST" });
      try {
        const activeVehicles = await apiFetchForOwner<ApiVehicle[]>("/Vehicles?onlyActive=true");
        setVehicles(activeVehicles.map(mapApiVehicle));
        setResourceError("vehículos", false);
        return { ok: true, message: "Vehículo reactivado" };
      } catch {
        setResourceError("vehículos", true);
        return { ok: true, message: "Vehículo reactivado; recarga la lista para sincronizar los cambios." };
      }
    } catch (error) {
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo reactivar el vehículo"),
      };
    }
  };

  // ---------------- ROUTES ----------------

  // ✅ helper para re-listar SIEMPRE desde BD sin tocar otras cosas
  const refreshRoutes = useCallback(async () => {
    if (!apiFetch) return;

    const data = await apiFetchForOwner<ApiRoute[]>("/Routes");
    const active = data.filter((route) => route.isActive !== false);

    setRoutes(active.map(mapApiRoute));
    setResourceError("rutas", false);
    setRoutesLoaded(true);
  }, [apiFetch, apiFetchForOwner, setResourceError]);

  const refreshDrivers = useCallback(
    async (onlyActive = true) => {
      if (!apiFetch || user?.role === "chofer" || user?.role === "usuario") return;
      const requestSequence = ++driversRequestSequence.current;
      const ownerSession = captureOwnerSession();
      const query = onlyActive ? "?onlyActive=true" : "";
      try {
        const data = await apiFetchForOwner<ApiDriver[]>(`/Drivers${query}`);
        if (requestSequence !== driversRequestSequence.current || !isCurrentOwnerSession(ownerSession)) return;
        const visibleDrivers = onlyActive
          ? data.filter((driver) => driver.isActive !== false)
          : data;
        setDrivers(visibleDrivers.map(mapApiDriver));
        setResourceError("conductores", false);
      } catch (error) {
        if (requestSequence !== driversRequestSequence.current || !isCurrentOwnerSession(ownerSession)) return;
        setResourceError("conductores", true);
        throw error;
      }
    },
    [apiFetch, apiFetchForOwner, captureOwnerSession, isCurrentOwnerSession, setResourceError, user?.role],
  );

  useEffect(() => {
    const loadRoutes = async () => {
      if (!apiFetch || isLoadingUser || !isAuthenticated) return;
      if (user?.role === "usuario") {
        setRoutesLoading(false);
        setRoutesLoaded(true);
        return;
      }
      const ownerSession = captureOwnerSession();
      setRoutesLoading(true);
      try {
        await refreshRoutes();
      } catch (error) {
        if (isAuthError(error)) return;
        setResourceError("rutas", true);
        setRoutesLoaded(true);
        console.error("Error cargando rutas desde API", error);
      } finally {
        if (isCurrentOwnerSession(ownerSession)) setRoutesLoading(false);
      }
    };

    void loadRoutes();
  }, [apiFetch, captureOwnerSession, isAuthenticated, isAuthError, isCurrentOwnerSession, isLoadingUser, refreshRoutes, setResourceError, user?.role]);

  useEffect(() => {
    const loadDrivers = async () => {
      if (!apiFetch || isLoadingUser || !isAuthenticated) return;
      if (["chofer", "usuario", "logistica"].includes(user?.role ?? "")) return;
      try {
        await refreshDrivers();
      } catch (error) {
        if (isAuthError(error)) return;
        setResourceError("conductores", true);
        console.error("Error cargando drivers desde API", error);
      }
    };

    void loadDrivers();
  }, [
    apiFetch,
    isAuthenticated,
    isLoadingUser,
    isAuthError,
    refreshDrivers,
    setResourceError,
    user?.role,
  ]);

  const retryFleetData = async () => {
    const ownerSession = captureOwnerSession();
    const failures: string[] = [];
    if (["gerente", "manager", "logistica"].includes(user?.role ?? "")) {
      try { await refreshRouteAssignmentOptions(); } catch { failures.push("opciones de asignación"); }
      if (!isCurrentOwnerSession(ownerSession)) return;
    }
    if (!["chofer", "usuario", "logistica"].includes(user?.role ?? "")) {
      setVehiclesLoading(true);
      setVehiclesLoaded(false);
      try {
        const data = await apiFetchForOwner<ApiVehicle[]>("/Vehicles");
        setVehicles(data.filter((item) => item.isActive !== false).map(mapApiVehicle));
        setResourceError("vehículos", false);
        setVehiclesLoaded(true);
      } catch { failures.push("vehículos"); setVehiclesLoaded(true); }
      finally { if (isCurrentOwnerSession(ownerSession)) setVehiclesLoading(false); }
      if (!isCurrentOwnerSession(ownerSession)) return;
      try { await refreshDrivers(); } catch { failures.push("conductores"); }
      if (!isCurrentOwnerSession(ownerSession)) return;
    }
    if (user?.role !== "usuario") {
      setRoutesLoading(true);
      setRoutesLoaded(false);
      try { await refreshRoutes(); } catch { failures.push("rutas"); }
      finally { if (isCurrentOwnerSession(ownerSession)) setRoutesLoaded(true); }
      if (isCurrentOwnerSession(ownerSession)) setRoutesLoading(false);
      if (!isCurrentOwnerSession(ownerSession)) return;
    }
    if (isCurrentOwnerSession(ownerSession)) setLoadErrors(failures);
  };

  const userOwnsLoadedData = !!user && fleetOwnerId === user.id;

  const addRoute = async (
    route: Omit<Route, "id" | "fechaCreacion">,
  ): Promise<ActionResult> => {
    try {
      const payload = toApiRoutePayload(route);

      await apiFetchForOwner<ApiRoute>("/Routes", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await refreshRoutes();
      return { ok: true, message: "Ruta creada correctamente" };
    } catch (error) {
      console.error("Error al crear ruta:", error);
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo crear la ruta"),
      };
    }
  };

  // ✅ PUT /api/Routes/{id} con body EXACTO que pasaste
  const updateRoute = async (
    id: string,
    routePatch: Partial<Route>,
  ): Promise<ActionResult> => {
    try {
      const current = routes.find((r) => r.id === id);
      if (!current) throw new Error("Ruta no encontrada");

      const routePatchKeys = Object.keys(routePatch);
      const statusOnlyPatch =
        routePatch.estado !== undefined &&
        routePatchKeys.every((key) =>
          ["estado", "fechaInicio", "fechaFin"].includes(key),
        );
      if (statusOnlyPatch) {
        await apiFetchForOwner(`/Routes/${id}/status`, {
          method: "PUT",
          body: JSON.stringify({
            status: stateToApiStatusNumber(routePatch.estado),
          }),
        });
        await refreshRoutes();
        return { ok: true, message: "Estado de ruta actualizado" };
      }

      const merged: Route = {
        ...current,
        ...routePatch,
        origen: routePatch.origen ?? current.origen,
        destino: routePatch.destino ?? current.destino,
        puntos: routePatch.puntos ?? current.puntos,
      };

      const payload = {
        vehicleId: merged.vehiculoId,
        driverId: merged.conductorId,
        name: merged.nombre,
        points: [
          ...(merged.origen
            ? [
                {
                  lat: Number(merged.origen.lat ?? 0),
                  lng: Number(merged.origen.lng ?? 0),
                  name: merged.origen.nombre ?? "Origen",
                  operation: pointOperationToApiNumber(merged.origen.operation),
                },
              ]
            : []),
          ...(merged.puntos ?? []).map((p, idx) => ({
            lat: Number(p.lat),
            lng: Number(p.lng),
            name: p.nombre ?? `Parada ${idx + 1}`,
            operation: pointOperationToApiNumber(p.operation),
          })),
          ...(merged.destino
            ? [
                {
                  lat: Number(merged.destino.lat ?? 0),
                  lng: Number(merged.destino.lng ?? 0),
                  name: merged.destino.nombre ?? "Destino",
                  operation: pointOperationToApiNumber(merged.destino.operation),
                },
              ]
            : []),
        ],
        origin: merged.origen
          ? {
              lat: Number(merged.origen.lat ?? 0),
              lng: Number(merged.origen.lng ?? 0),
              name: merged.origen.nombre ?? "Origen",
                  operation: pointOperationToApiNumber(merged.origen.operation),
            }
          : undefined,
        destination: merged.destino
          ? {
              lat: Number(merged.destino.lat ?? 0),
              lng: Number(merged.destino.lng ?? 0),
              name: merged.destino.nombre ?? "Destino",
                  operation: pointOperationToApiNumber(merged.destino.operation),
            }
          : undefined,
        cargoDescription: merged.carga ?? "",
        plannedStart: merged.fechaInicio ?? null,
        plannedEnd: merged.fechaFin ?? (merged.fechaInicio
          ? new Date(new Date(merged.fechaInicio).getTime() + 60 * 60 * 1000).toISOString()
          : null),
        status: stateToApiStatusNumber(merged.estado),
        isActive: true,
      };

      await apiFetchForOwner<ApiRoute>(`/Routes/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const finished =
        typeof merged.estado === "string" &&
        ["completada", "cancelada"].includes(merged.estado.toLowerCase());
      if (finished && merged.conductorId) {
        await unassignVehicleFromDriver(merged.conductorId);
      }
      await refreshRoutes();
      return { ok: true, message: "Ruta actualizada" };
    } catch (error) {
      console.error("Error al actualizar ruta:", error);
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo actualizar la ruta"),
      };
    }
  };

  const deleteRoute = async (id: string): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Routes/${id}`, { method: "DELETE" });

      await refreshRoutes();
      return { ok: true, message: "Ruta eliminada" };
    } catch (error) {
      console.error("Error al eliminar ruta:", error);
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo eliminar la ruta"),
      };
    }
  };

  const registerRoutePosition = async (
    routeId: string,
    location: { lat: number; lng: number },
    meta?: { recordedAt?: string; speedKmh?: number; heading?: number },
  ): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Routes/${routeId}/positions`, {
        method: "POST",
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          recordedAt: meta?.recordedAt,
          speedKmh: meta?.speedKmh,
          heading: meta?.heading,
        }),
      });
      return { ok: true };
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (status !== 429) {
        console.warn("No se pudo registrar tracking en backend:", error);
      }
      return {
        ok: false,
        message: resolveApiMessage(
          error,
          "No se pudo registrar el tracking de la ruta",
        ),
      };
    }
  };

  const updateRoutePointStatus = async (
    routeId: string,
    pointIndex: number,
    status: RoutePointStatus,
  ): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Routes/${routeId}/points/${pointIndex}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: pointStatusToApiNumber(status) }),
      });
      await refreshRoutes();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: resolveApiMessage(error, "No se pudo actualizar la parada") };
    }
  };

  const addRoutePointEvidence = async (
    routeId: string,
    pointIndex: number,
    evidence: NewRouteEvidence,
  ): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Routes/${routeId}/points/${pointIndex}/evidence`, {
        method: "POST",
        body: JSON.stringify(evidence),
      });
      await refreshRoutes();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: resolveApiMessage(error, "No se pudo guardar la evidencia") };
    }
  };

  const getRoutesByDriver = (driverId: string): Route[] =>
    routes.filter((r) => r.conductorId === driverId);

  const getTeamVehicles = (): Vehicle[] => vehicles;

  const getTeamRoutes = (): Route[] => routes;

  const addDriver = async (
    driver: Omit<Driver, "id" | "isActive" | "vehicleId">,
  ): Promise<ActionResult> => {
    try {
      const payload = {
        firstName: driver.firstName,
        lastName: driver.lastName,
        documentNumber: driver.documentNumber,
        phoneNumber: driver.phoneNumber,
        userId: driver.userId ?? null,
      };
      const created = await apiFetchForOwner<ApiDriver>("/Drivers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const mapped = mapApiDriver(created);
      setDrivers((prev) => [...prev, mapped]);
      return { ok: true, message: "Chofer creado" };
    } catch (error) {
      console.error("Error al crear chofer:", error);
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo crear el chofer"),
      };
    }
  };

  const updateDriver = async (
    id: string,
    driver: Pick<Driver, "firstName" | "lastName" | "documentNumber" | "phoneNumber">,
  ): Promise<ActionResult> => {
    try {
      const updated = await apiFetchForOwner<ApiDriver>(`/Drivers/${id}`, {
        method: "PUT",
        body: JSON.stringify(driver),
      });
      const mapped = mapApiDriver(updated);
      setDrivers((prev) => prev.map((item) => item.id === id ? mapped : item));
      return { ok: true, message: "Datos del conductor actualizados" };
    } catch (error) {
      return { ok: false, message: resolveApiMessage(error, "No se pudo actualizar el conductor") };
    }
  };

  const setDriverActive = async (id: string, isActive: boolean): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Drivers/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      });
      if (isActive) {
        await refreshDrivers(false);
      } else {
        setDrivers((prev) => prev.map((driver) =>
          driver.id === id ? { ...driver, isActive: false, vehicleId: undefined } : driver,
        ));
      }
      return { ok: true, message: isActive ? "Conductor reactivado" : "Conductor dado de baja" };
    } catch (error) {
      return { ok: false, message: resolveApiMessage(error, "No se pudo cambiar el estado del conductor") };
    }
  };

  const assignVehicleToDriver = async (
    driverId: string,
    vehicleId: string,
  ): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Drivers/${driverId}/assign-vehicle`, {
        method: "PUT",
        body: JSON.stringify({ vehicleId }),
      });
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, vehicleId } : d)),
      );
      return { ok: true, message: "Vehiculo asignado" };
    } catch (error) {
      console.error("Error asignando vehiculo:", error);
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo asignar el vehiculo"),
      };
    }
  };

  const unassignVehicleFromDriver = async (
    driverId: string,
  ): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Drivers/${driverId}/unassign-vehicle`, {
        method: "PUT",
      });
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driverId ? { ...d, vehicleId: undefined } : d,
        ),
      );
      return { ok: true, message: "Vehiculo desasignado" };
    } catch (error) {
      console.error("Error desasignando vehiculo:", error);
      return {
        ok: false,
        message: resolveApiMessage(error, "No se pudo desasignar el vehiculo"),
      };
    }
  };

  const unlinkUserFromDriver = async (driverId: string): Promise<ActionResult> => {
    try {
      await apiFetchForOwner(`/Drivers/${driverId}/unlink-user`, { method: "PUT" });
      setDrivers((prev) => prev.map((driver) =>
        driver.id === driverId ? { ...driver, userId: null } : driver,
      ));
      return { ok: true, message: "Cuenta desvinculada del conductor" };
    } catch (error) {
      return { ok: false, message: resolveApiMessage(error, "No se pudo desvincular la cuenta") };
    }
  };

  return (
    <FleetContext.Provider
      value={{
        vehicles: userOwnsLoadedData ? vehicles : [],
        routes: userOwnsLoadedData ? routes : [],
        drivers: userOwnsLoadedData ? drivers : [],
        routeAssignmentVehicles: userOwnsLoadedData ? routeAssignmentVehicles : [],
        routeAssignmentDrivers: userOwnsLoadedData ? routeAssignmentDrivers : [],
        loadErrors: userOwnsLoadedData ? loadErrors : [],
        vehiclesLoading: userOwnsLoadedData ? vehiclesLoading : !!user && !["chofer", "usuario", "logistica"].includes(user.role),
        routesLoading: userOwnsLoadedData ? routesLoading : !!user && user.role !== "usuario",
        routeAssignmentOptionsLoading: userOwnsLoadedData ? routeAssignmentOptionsLoading : !!user && ["gerente", "manager", "logistica"].includes(user.role),
        vehiclesLoaded: userOwnsLoadedData && vehiclesLoaded,
        routesLoaded: userOwnsLoadedData && routesLoaded,
        routeAssignmentOptionsLoaded: userOwnsLoadedData && routeAssignmentOptionsLoaded,
        retryFleetData,
        addVehicle,
        getInactiveVehicles,
        reactivateVehicle,
        updateVehicle,
        deleteVehicle,
        addRoute,
        updateRoute,
        deleteRoute,
        registerRoutePosition,
        updateRoutePointStatus,
        addRoutePointEvidence,
        getRoutesByDriver,
        getTeamVehicles,
        getTeamRoutes,
        refreshDrivers,
        addDriver,
        updateDriver,
        setDriverActive,
        assignVehicleToDriver,
        unassignVehicleFromDriver,
        unlinkUserFromDriver,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (context === undefined)
    throw new Error("useFleet debe ser usado dentro de un FleetProvider");
  return context;
}
