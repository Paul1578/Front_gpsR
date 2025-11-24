"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
}

export type RouteEvidence =
  | {
      id: string;
      type: "image";
      content: string;
      description?: string;
      timestamp: string;
    }
  | {
      id: string;
      type: "note";
      content: string;
      timestamp: string;
    };

export interface Route {
  id: string;
  nombre: string;
  vehiculoId: string;
  conductorId: string;
  carga: string;
  origen?: { lat: number; lng: number; nombre?: string };
  destino?: { lat: number; lng: number; nombre?: string };
  puntos: Array<{ lat: number; lng: number; nombre?: string }>; // paradas intermedias
  estado: "pendiente" | "en_progreso" | "completada" | "cancelada";
  fechaCreacion: string;
  fechaInicio?: string;
  fechaFin?: string;
  teamId?: string;
  evidencias?: RouteEvidence[];
  notas?: string;
}

interface FleetContextType {
  vehicles: Vehicle[];
  routes: Route[];
  addVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<boolean>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;
  addRoute: (route: Omit<Route, "id" | "fechaCreacion">) => Promise<boolean>;
  updateRoute: (id: string, route: Partial<Route>) => Promise<boolean>;
  deleteRoute: (id: string) => Promise<boolean>;
  updateVehicleLocation: (vehicleId: string, location: { lat: number; lng: number }) => void;
  addRouteEvidence: (routeId: string, evidence: Omit<RouteEvidence, "id" | "timestamp">) => void;
  getRoutesByDriver: (driverId: string) => Route[];
  getTeamVehicles: () => Vehicle[];
  getTeamRoutes: () => Route[];
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
};

type ApiRoutePoint = { latitude?: number; longitude?: number; lat?: number; lng?: number; name?: string };

type ApiRoute = {
  id: string;
  vehicleId: string;
  driverId: string;
  name: string;
  origin?: { latitude?: number; longitude?: number; lat?: number; lng?: number; name?: string };
  destination?: { latitude?: number; longitude?: number; lat?: number; lng?: number; name?: string };
  points: ApiRoutePoint[];
  cargoDescription?: string;
  plannedStart?: string;
  plannedEnd?: string;
  status?: string | number;
  isActive?: boolean;
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

const mapApiVehicle = (apiVehicle: ApiVehicle): Vehicle => ({
  id: apiVehicle.id,
  placa: apiVehicle.plate,
  marca: apiVehicle.brand,
  modelo: apiVehicle.model,
  anio: apiVehicle.year,
  descripcion: apiVehicle.description,
  estado: statusNumberToState(apiVehicle.status),
});

const mapApiRoute = (apiRoute: ApiRoute): Route => {
  const normalizeStatus = (status?: string | number): Route["estado"] => {
    if (typeof status === "number") {
      if (status === 1) return "en_progreso";
      if (status === 2) return "completada";
      if (status === 3) return "cancelada";
      return "pendiente";
    }

    const key = (status ?? "").toString().toLowerCase();
    if (key.includes("progress") || key.includes("curso") || key.includes("progreso")) return "en_progreso";
    if (key.includes("complete") || key.includes("complet")) return "completada";
    if (key.includes("cancel")) return "cancelada";
    return "pendiente";
  };

  const puntos =
    apiRoute.points?.map((p, idx) => ({
      lat: p.latitude ?? p.lat ?? 0,
      lng: p.longitude ?? p.lng ?? 0,
      nombre: p.name ?? `Punto ${idx + 1}`,
    })) ?? [];

  return {
    id: apiRoute.id,
    nombre: apiRoute.name,
    vehiculoId: apiRoute.vehicleId,
    conductorId: apiRoute.driverId,
    carga: apiRoute.cargoDescription ?? "",
    origen: apiRoute.origin
      ? {
          lat: apiRoute.origin.lat ?? apiRoute.origin.latitude ?? 0,
          lng: apiRoute.origin.lng ?? apiRoute.origin.longitude ?? 0,
          nombre: apiRoute.origin.name,
        }
      : undefined,
    destino: apiRoute.destination
      ? {
          lat: apiRoute.destination.lat ?? apiRoute.destination.latitude ?? 0,
          lng: apiRoute.destination.lng ?? apiRoute.destination.longitude ?? 0,
          nombre: apiRoute.destination.name,
        }
      : undefined,
    puntos,
    estado: normalizeStatus(apiRoute.status),
    fechaCreacion: apiRoute.plannedStart ?? new Date().toISOString(),
    fechaInicio: apiRoute.plannedStart,
    fechaFin: apiRoute.plannedEnd,
  };
};

  const toApiRoutePayload = (route: Partial<Route>) => {
  const stateToApiStatusNumber = (estado?: Route["estado"]): number => {
    if (!estado) return 0; // Pending
    const key = estado.toLowerCase();
    if (key.includes("progreso")) return 1; // InProgress
    if (key.includes("complet")) return 2; // Completed
    if (key.includes("cancel")) return 3; // Cancelled
    return 0;
  };

  const points: Array<{ lat: number; lng: number; name?: string }> = [];

  if (route.origen) {
    points.push({
      lat: Number(route.origen.lat),
      lng: Number(route.origen.lng),
      name: route.origen.nombre ?? "Punto de inicio",
    });
  }

  (route.puntos ?? []).forEach((p, idx) => {
    points.push({
      lat: Number(p.lat),
      lng: Number(p.lng),
      name: p.nombre ?? `Parada ${idx + 1}`,
    });
  });

  if (route.destino) {
    points.push({
      lat: Number(route.destino.lat),
      lng: Number(route.destino.lng),
      name: route.destino.nombre ?? "Destino",
    });
  }

  const plannedStart = route.fechaInicio ?? new Date().toISOString();
  const plannedEnd =
    route.fechaFin ??
    new Date(new Date(plannedStart).getTime() + 60 * 60 * 1000).toISOString();

  return {
    vehicleId: route.vehiculoId,
    driverId: route.conductorId,
    name: route.nombre,
    origin: route.origen
      ? {
          lat: Number(route.origen.lat ?? 0),
          lng: Number(route.origen.lng ?? 0),
          name: route.origen.nombre ?? "Origen",
        }
      : undefined,
    destination: route.destino
      ? {
          lat: Number(route.destino.lat ?? 0),
          lng: Number(route.destino.lng ?? 0),
          name: route.destino.nombre ?? "Destino",
        }
      : undefined,
    points,
    cargoDescription: route.carga,
    plannedStart,
    plannedEnd,
    status: stateToApiStatusNumber(route.estado),
    isActive: true,
  };
};

export function FleetProvider({ children }: { children: ReactNode }) {
  const { apiFetch, isAuthenticated, isLoadingUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  // Vehicles
  useEffect(() => {
    const loadVehicles = async () => {
      if (!apiFetch || isLoadingUser || !isAuthenticated) return;
      try {
        const data = await apiFetch<ApiVehicle[]>("/Vehicles");
        setVehicles(data.map(mapApiVehicle));
      } catch (error) {
        console.error("Error cargando vehículos desde API", error);
      }
    };
    void loadVehicles();
  }, [apiFetch, isAuthenticated, isLoadingUser]);

  const persistLocalVehicles = (items: Vehicle[]) => {
    if (typeof window !== "undefined") localStorage.setItem("vehicles", JSON.stringify(items));
  };

  const addVehicle = async (vehicle: Omit<Vehicle, "id">): Promise<boolean> => {
    try {
      const payload = {
        plate: vehicle.placa,
        brand: vehicle.marca,
        model: vehicle.modelo,
        year: vehicle.anio,
        description: vehicle.descripcion ?? "",
      };
      const created = await apiFetch<ApiVehicle>("/Vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const mapped = mapApiVehicle(created);
      const updated = [...vehicles, mapped];
      setVehicles(updated);
      persistLocalVehicles(updated);
      return true;
    } catch (error) {
      console.error("Error al crear vehículo:", error);
      return false;
    }
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>): Promise<boolean> => {
    try {
      const current = vehicles.find((v) => v.id === id);
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
        await apiFetch(`/Vehicles/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      }

      if (nextEstado && current?.estado !== nextEstado) {
        await apiFetch(`/Vehicles/${id}/status`, {
          method: "PUT",
          body: JSON.stringify({ status: stateToStatusNumber(nextEstado) }),
        });
      }

      const updatedVehicles = vehicles.map((v) => (v.id === id ? { ...v, ...vehicleData } : v));
      setVehicles(updatedVehicles);
      persistLocalVehicles(updatedVehicles);
      return true;
    } catch (error) {
      console.error("Error al actualizar vehículo:", error);
      return false;
    }
  };

  const deleteVehicle = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/Vehicles/${id}`, { method: "DELETE" });
      const updatedVehicles = vehicles.filter((v) => v.id !== id);
      setVehicles(updatedVehicles);
      persistLocalVehicles(updatedVehicles);
      return true;
    } catch (error) {
      console.error("Error al eliminar vehículo:", error);
      return false;
    }
  };

  // Routes
  useEffect(() => {
    const loadRoutes = async () => {
      if (!apiFetch || isLoadingUser || !isAuthenticated) return;
      try {
        const data = await apiFetch<ApiRoute[]>("/Routes");
        setRoutes(data.map(mapApiRoute));
      } catch (error) {
        console.error("Error cargando rutas desde API", error);
      }
    };
    void loadRoutes();
  }, [apiFetch, isAuthenticated, isLoadingUser]);

  const addRoute = async (route: Omit<Route, "id" | "fechaCreacion">): Promise<boolean> => {
    try {
      const payload = toApiRoutePayload(route);
      const created = await apiFetch<ApiRoute>("/Routes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const mapped = mapApiRoute(created);
      setRoutes((prev) => [...prev, mapped]);
      return true;
    } catch (error) {
      console.error("Error al crear ruta:", error);
      return false;
    }
  };

  const updateRoute = async (id: string, route: Partial<Route>): Promise<boolean> => {
    try {
      const payload = toApiRoutePayload(route);
      const updated = await apiFetch<ApiRoute>(`/Routes/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const mapped = mapApiRoute(updated);
      setRoutes((prev) => prev.map((r) => (r.id === id ? { ...mapped, evidencias: r.evidencias } : r)));
      return true;
    } catch (error) {
      console.error("Error al actualizar ruta:", error);
      return false;
    }
  };

  const deleteRoute = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/Routes/${id}`, { method: "DELETE" });
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      return true;
    } catch (error) {
      console.error("Error al eliminar ruta:", error);
      return false;
    }
  };

  const updateVehicleLocation = (vehicleId: string, location: { lat: number; lng: number }) => {
    void (async () => {
      try {
        await apiFetch(`/Vehicles/${vehicleId}/location`, {
          method: "PUT",
          body: JSON.stringify({ latitude: location.lat, longitude: location.lng }),
        });
      } catch (error) {
        console.warn("No se pudo persistir ubicacion en backend, usando estado local:", error);
      }
      await updateVehicle(vehicleId, { ubicacionActual: location });
    })();
  };

  const addRouteEvidence = (routeId: string, evidence: Omit<RouteEvidence, "id" | "timestamp">) => {
    const newEvidence: RouteEvidence = {
      ...evidence,
      id: crypto.randomUUID ? crypto.randomUUID() : `evi-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId ? { ...r, evidencias: [...(r.evidencias ?? []), newEvidence] } : r
      )
    );
  };

  const getRoutesByDriver = (driverId: string): Route[] =>
    routes.filter((r) => r.conductorId === driverId);

  const getTeamVehicles = (): Vehicle[] => {
    return vehicles;
  };

  const getTeamRoutes = (): Route[] => routes;

  return (
    <FleetContext.Provider
      value={{
        vehicles,
        routes,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addRoute,
        updateRoute,
        deleteRoute,
        updateVehicleLocation,
        addRouteEvidence,
        getRoutesByDriver,
        getTeamVehicles,
        getTeamRoutes,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (context === undefined) throw new Error("useFleet debe ser usado dentro de un FleetProvider");
  return context;
}
