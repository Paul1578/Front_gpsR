"use client";

import { useState } from "react";
import { LogOut, Map, Truck, Route, Users, Menu, X, Home, History, UserCircle, Shield } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { MainDashboard } from "./fleet/MainDashboard";
import { MapView } from "./fleet/MapView";
import { VehiclesManagement } from "./fleet/VehiclesManagement";
import { RoutesManagement } from "./fleet/RoutesManagement";
import { TeamManagement } from "./fleet/TeamManagement";
import { DriverView } from "./fleet/DriverView";
import { RouteHistory } from "./fleet/RouteHistory";
import { ProfileView } from "./fleet/ProfileView";
import { SuperAdminView } from "./fleet/SuperAdminView";
import { useAuth } from "@/Context/AuthContext";

export type ViewType = "home" | "map" | "vehicles" | "routes" | "team" | "driver" | "history" | "profile" | "superadmin";

export function FleetDashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <aside
          className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-lg z-30 transform transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Panel</p>
              <p className="text-lg font-semibold text-gray-900">FleetTrack</p>
            </div>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </div>

          <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-120px)]">
            {menuItems.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="flex items-center justify-between gap-4 px-4 md:px-8 py-4 bg-white border-b border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="size-5 text-gray-600" />
              </button>
              <div>
                <p className="text-sm text-gray-500">Bienvenido</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.nombres} {user.apellidos}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Rol</p>
              <p className="text-sm font-semibold text-gray-800">{user.role}</p>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto h-full">{renderView()}</div>
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
