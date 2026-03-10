"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LogOut, Map, Truck, Route, Users, Menu, X, Home, History, UserCircle, Shield } from "lucide-react";
import dynamic from "next/dynamic";
import { ConfirmDialog } from "./ConfirmDialog";
import { MainDashboard } from "./fleet/MainDashboard";
import { VehiclesManagement } from "./fleet/VehiclesManagement";
import { RoutesManagement } from "./fleet/RoutesManagement";
import { TeamManagement } from "./fleet/TeamManagement";
import { DriverView } from "./fleet/DriverView";
import { RouteHistory } from "./fleet/RouteHistory";
import { ProfileView } from "./fleet/ProfileView";
import { SuperAdminView } from "./fleet/SuperAdminView";
import { useAuth } from "@/Context/AuthContext";

const MapView = dynamic(
  () => import("./fleet/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-gray-500">
        Cargando mapa...
      </div>
    ),
  }
);

export type ViewType = "home" | "map" | "vehicles" | "routes" | "team" | "driver" | "history" | "profile" | "superadmin";

export function FleetDashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) return;

    const requestLocation = () => {
      navigator.geolocation.getCurrentPosition(
        () => undefined,
        () => undefined,
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    };

    const permissionsApi = (
      navigator as Navigator & {
        permissions?: {
          query: (permissionDesc: PermissionDescriptor) => Promise<PermissionStatus>;
        };
      }
    ).permissions;
    if (permissionsApi?.query) {
      permissionsApi
        .query({ name: "geolocation" })
        .then((status: PermissionStatus) => {
          if (status.state !== "granted") requestLocation();
          status.onchange = () => {
            if (status.state !== "granted") requestLocation();
          };
        })
        .catch(() => requestLocation());
    } else {
      requestLocation();
    }
  }, []);

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const handleNavigation = (view: ViewType) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  if (!user || !user.permissions) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  const menuItems: {
    id: ViewType;
    label: string;
    icon: typeof Home;
    permission: boolean;
  }[] = [
    { id: "home", label: "Dashboard Principal", icon: Home, permission: true },
    { id: "superadmin", label: "Super Admin", icon: Shield, permission: user.permissions.canAccessSuperAdmin || false },
    { id: "profile", label: "Mi Perfil", icon: UserCircle, permission: true },
    { id: "map", label: "Mapa en Tiempo Real", icon: Map, permission: user.permissions.canViewMap },
    { id: "routes", label: "Gestión de Rutas", icon: Route, permission: user.permissions.canCreateRoutes },
    { id: "history", label: "Historial de Rutas", icon: History, permission: user.permissions.canViewMap || user.permissions.canCreateRoutes },
    { id: "vehicles", label: "Gestión de Vehículos", icon: Truck, permission: user.permissions.canManageVehicles },
    { id: "team", label: "Gestión de Equipo", icon: Users, permission: user.permissions.canManageTeam },
    { id: "driver", label: "Mi Ruta", icon: Route, permission: user.permissions.canViewOwnRoute },
  ].filter((item): item is typeof item & { id: ViewType } => !!item.permission);

  const renderView = () => {
    const handleBack = () => setCurrentView("home");

    switch (currentView) {
      case "home": return <MainDashboard onNavigate={handleNavigation} />;
      case "superadmin": return <SuperAdminView onBack={handleBack} />;
      case "profile": return <ProfileView onBack={handleBack} />;
      case "map": return <MapView onBack={handleBack} />;
      case "vehicles": return <VehiclesManagement onBack={handleBack} />;
      case "routes": return <RoutesManagement onBack={handleBack} />;
      case "history": return <RouteHistory onBack={handleBack} />;
      case "team": return <TeamManagement onBack={handleBack} />;
      case "driver": return <DriverView onBack={handleBack} />;
      default: return <MainDashboard onNavigate={handleNavigation} />;
    }
  };

  return (
    <>
      <div className="flex h-dvh min-h-dvh w-full bg-gray-50 overflow-hidden">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Cerrar menú lateral"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-[1900] bg-slate-950/45 backdrop-blur-[1px] md:hidden"
          />
        )}

        <aside
          className={`fixed md:static inset-y-0 left-0 w-[90vw] max-sm:w-full sm:w-80 md:w-64 max-w-full bg-white border-r border-gray-200 shadow-lg z-[2000] transform transition-transform duration-300 flex flex-col ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex h-20 items-center justify-between px-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Image
                src="/brand/logo-mark.png"
                alt="FleetFlow"
                width={48}
                height={48}
                className="h-10 w-10"
                priority
              />
              <div>
                <p className="text-sm text-gray-500">Panel</p>
                <p className="text-lg font-semibold text-gray-900">FleetFlow</p>
              </div>
            </div>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 mt-auto">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="flex-1 w-0 min-w-0 flex flex-col overflow-hidden">
          <header className="flex h-20 items-center justify-between gap-4 px-4 md:px-8 bg-white border-b border-gray-100">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="size-5 text-gray-600" />
              </button>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Bienvenido</p>
                <p className="truncate text-lg font-semibold text-gray-900">
                  {user.nombres} {user.apellidos}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Rol</p>
              <p className="text-sm font-semibold text-gray-800">{user.role}</p>
            </div>
          </header>

          <main className="flex-1 min-w-0 overflow-auto overflow-x-hidden">
            {renderView()}
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
        title="Cerrar sesión"
        description="¿Estás seguro de que quieres cerrar sesión?"
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
      />
    </>
  );
}
