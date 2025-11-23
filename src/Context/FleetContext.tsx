"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  estado: "disponible" | "en_ruta" | "mantenimiento";
  ubicacionActual?: {
    lat: number;
    lng: number;
  };
  teamId?: string;
  descripcion?: string;
}

export interface RouteEvidence {
  id: string;
  type: "image" | "note";
  content: string;
  timestamp: string;
  description?: string;
}

export interface Route {
  id: string;
  nombre: string;
  vehiculoId: string;
  conductorId: string;
  carga: string;
  puntos: Array<{ lat: number; lng: number; nombre: string }>;
  estado: "pendiente" | "en_progreso" | "completada" | "cancelada";
  fechaCreacion: string;
  fechaInicio?: string;
  fechaFin?: string;
  evidencias?: RouteEvidence[];
  notas?: string;
  teamId?: string;
}

interface FleetContextType {
  vehicles: Vehicle[];
  routes: Route[];
  addVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<boolean>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;
  addRoute: (route: Omit<Route, "id" | "fechaCreacion">) => void;
  updateRoute: (id: string, route: Partial<Route>) => void;
  deleteRoute: (id: string) => void;
  updateVehicleLocation: (vehicleId: string, location: { lat: number; lng: number }) => void;
  getRoutesByDriver: (driverId: string) => Route[];
  getTeamVehicles: () => Vehicle[];
  getTeamRoutes: () => Route[];
  addRouteEvidence: (routeId: string, evidence: Omit<RouteEvidence, "id" | "timestamp">) => void;
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

export function FleetProvider({ children }: { children: ReactNode }) {
  const { apiFetch } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  const getCurrentUserTeamId = (): string | undefined => {
    if (typeof window === "undefined") return undefined;
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      const user = JSON.parse(currentUser);
      if (user.role === "gerente") return user.id;
      return user.teamId;
    }
    return undefined;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedRoutes = localStorage.getItem("routes");
    if (savedRoutes) {
      setRoutes(JSON.parse(savedRoutes));
    }
  }, []);

  useEffect(() => {
    const loadVehicles = async () => {
      if (!apiFetch) return;
      try {
        const data = await apiFetch<ApiVehicle[]>("/Vehicles");
        setVehicles(data.map(mapApiVehicle));
      } catch (error) {
        console.error("Error cargando vehículos desde API, usando localStorage si existe", error);
        const savedVehicles = typeof window !== "undefined" ? localStorage.getItem("vehicles") : null;
        if (savedVehicles) {
          setVehicles(JSON.parse(savedVehicles));
        }
      }
    };
    void loadVehicles();
  }, [apiFetch]);

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
      if (apiFetch) {
        const created = await apiFetch<ApiVehicle>("/Vehicles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const mapped = mapApiVehicle(created);
        const updated = [...vehicles, mapped];
        setVehicles(updated);
        persistLocalVehicles(updated);
        return true;
      }
    } catch (error) {
      console.error("Error al crear vehículo:", error);
    }
    return false;
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>): Promise<boolean> => {
    try {
      const current = vehicles.find((v) => v.id === id);
      const nextEstado = vehicleData.estado ?? current?.estado;

      if (apiFetch) {
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
      if (apiFetch) {
        await apiFetch(`/Vehicles/${id}`, { method: "DELETE" });
      }
      const updatedVehicles = vehicles.filter((v) => v.id !== id);
      setVehicles(updatedVehicles);
      persistLocalVehicles(updatedVehicles);
      return true;
    } catch (error) {
      console.error("Error al eliminar vehículo:", error);
      return false;
    }
  };

  const addRoute = (route: Omit<Route, "id" | "fechaCreacion">) => {
    const teamId = getCurrentUserTeamId();
    const newRoute: Route = {
      ...route,
      id: Date.now().toString(),
      fechaCreacion: new Date().toISOString(),
      teamId,
    };
    const updatedRoutes = [...routes, newRoute];
    setRoutes(updatedRoutes);
    if (typeof window !== "undefined") localStorage.setItem("routes", JSON.stringify(updatedRoutes));

    void updateVehicle(route.vehiculoId, { estado: "en_ruta" });
  };

  const updateRoute = (id: string, routeData: Partial<Route>) => {
    const updatedRoutes = routes.map((r) => (r.id === id ? { ...r, ...routeData } : r));
    setRoutes(updatedRoutes);
    if (typeof window !== "undefined") localStorage.setItem("routes", JSON.stringify(updatedRoutes));
  };

  const deleteRoute = (id: string) => {
    const route = routes.find((r) => r.id === id);
    if (route) void updateVehicle(route.vehiculoId, { estado: "disponible" });

    const updatedRoutes = routes.filter((r) => r.id !== id);
    setRoutes(updatedRoutes);
    if (typeof window !== "undefined") localStorage.setItem("routes", JSON.stringify(updatedRoutes));
  };

  const updateVehicleLocation = (vehicleId: string, location: { lat: number; lng: number }) => {
    void updateVehicle(vehicleId, { ubicacionActual: location });
  };

  const getRoutesByDriver = (driverId: string): Route[] => routes.filter((r) => r.conductorId === driverId);

  const addRouteEvidence = (routeId: string, evidence: Omit<RouteEvidence, "id" | "timestamp">) => {
    const route = routes.find((r) => r.id === routeId);
    if (route) {
      const newEvidence: RouteEvidence = {
        ...evidence,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      const updatedEvidences = [...(route.evidencias || []), newEvidence];
      updateRoute(routeId, { evidencias: updatedEvidences });
    }
  };

  const getTeamVehicles = (): Vehicle[] => {
    const teamId = getCurrentUserTeamId();
    if (!teamId) return vehicles;
    // Incluir vehículos sin teamId (provenientes del backend) además de los del equipo
    return vehicles.filter((v) => !v.teamId || v.teamId === teamId);
  };

  const getTeamRoutes = (): Route[] => {
    const teamId = getCurrentUserTeamId();
    if (!teamId) return routes;
    return routes.filter((r) => r.teamId === teamId);
  };

  return (
    <FleetContext.Provider
      value={{
        vehicles: getTeamVehicles(),
        routes: getTeamRoutes(),
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addRoute,
        updateRoute,
        deleteRoute,
        updateVehicleLocation,
        getRoutesByDriver,
        getTeamVehicles,
        getTeamRoutes,
        addRouteEvidence,
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
