'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  año: number;
  estado: "disponible" | "en_ruta" | "mantenimiento";
  ubicacionActual?: {
    lat: number;
    lng: number;
  };
  teamId?: string;
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
  addVehicle: (vehicle: Omit<Vehicle, "id">) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
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

export function FleetProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  // Helper seguro para SSR
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

  // Cargar datos desde localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedVehicles = localStorage.getItem("vehicles");
    const savedRoutes = localStorage.getItem("routes");

    if (savedVehicles) {
      setVehicles(JSON.parse(savedVehicles));
    } else {
      const initialVehicles: Vehicle[] = [
        {
          id: "1",
          placa: "ABC-123",
          marca: "Toyota",
          modelo: "Hilux",
          año: 2022,
          estado: "disponible",
          ubicacionActual: { lat: -12.0464, lng: -77.0428 },
        },
        {
          id: "2",
          placa: "XYZ-789",
          marca: "Nissan",
          modelo: "Frontier",
          año: 2021,
          estado: "disponible",
          ubicacionActual: { lat: -12.0564, lng: -77.0528 },
        },
      ];
      setVehicles(initialVehicles);
      localStorage.setItem("vehicles", JSON.stringify(initialVehicles));
    }

    if (savedRoutes) {
      setRoutes(JSON.parse(savedRoutes));
    }
  }, []);

  const addVehicle = (vehicle: Omit<Vehicle, "id">) => {
    const teamId = getCurrentUserTeamId();
    const newVehicle: Vehicle = { ...vehicle, id: Date.now().toString(), teamId };
    const updatedVehicles = [...vehicles, newVehicle];
    setVehicles(updatedVehicles);
    if (typeof window !== "undefined") localStorage.setItem("vehicles", JSON.stringify(updatedVehicles));
  };

  const updateVehicle = (id: string, vehicleData: Partial<Vehicle>) => {
    const updatedVehicles = vehicles.map(v => (v.id === id ? { ...v, ...vehicleData } : v));
    setVehicles(updatedVehicles);
    if (typeof window !== "undefined") localStorage.setItem("vehicles", JSON.stringify(updatedVehicles));
  };

  const deleteVehicle = (id: string) => {
    const updatedVehicles = vehicles.filter(v => v.id !== id);
    setVehicles(updatedVehicles);
    if (typeof window !== "undefined") localStorage.setItem("vehicles", JSON.stringify(updatedVehicles));
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

    updateVehicle(route.vehiculoId, { estado: "en_ruta" });
  };

  const updateRoute = (id: string, routeData: Partial<Route>) => {
    const updatedRoutes = routes.map(r => (r.id === id ? { ...r, ...routeData } : r));
    setRoutes(updatedRoutes);
    if (typeof window !== "undefined") localStorage.setItem("routes", JSON.stringify(updatedRoutes));
  };

  const deleteRoute = (id: string) => {
    const route = routes.find(r => r.id === id);
    if (route) updateVehicle(route.vehiculoId, { estado: "disponible" });

    const updatedRoutes = routes.filter(r => r.id !== id);
    setRoutes(updatedRoutes);
    if (typeof window !== "undefined") localStorage.setItem("routes", JSON.stringify(updatedRoutes));
  };

  const updateVehicleLocation = (vehicleId: string, location: { lat: number; lng: number }) => {
    updateVehicle(vehicleId, { ubicacionActual: location });
  };

  const getRoutesByDriver = (driverId: string): Route[] => routes.filter(r => r.conductorId === driverId);

  const addRouteEvidence = (routeId: string, evidence: Omit<RouteEvidence, "id" | "timestamp">) => {
    const route = routes.find(r => r.id === routeId);
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
    if (!teamId) return [];
    return vehicles.filter(v => v.teamId === teamId);
  };

  const getTeamRoutes = (): Route[] => {
    const teamId = getCurrentUserTeamId();
    if (!teamId) return [];
    return routes.filter(r => r.teamId === teamId);
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
