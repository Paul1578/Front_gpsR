"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LogOut,
  Map,
  Truck,
  Route,
  Users,
  Menu,
  X,
  Home,
  History,
  UserCircle,
  Shield,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MainDashboard } from "@/components/fleet/MainDashboard";
import { MapView } from "@/components/fleet/MapView";
import { VehiclesManagement } from "@/components/fleet/VehiclesManagement";
import { RoutesManagement } from "@/components/fleet/RoutesManagement";
import { TeamManagement } from "@/components/fleet/TeamManagement";
import { DriverView } from "@/components/fleet/DriverView";
import { RouteHistory } from "@/components/fleet/RouteHistory";
import { ProfileView } from "@/components/fleet/ProfileView";
import { SuperAdminView } from "@/components/fleet/SuperAdminView";

type ViewType =
  | "home"
  | "map"
  | "vehicles"
  | "routes"
  | "team"
  | "driver"
  | "history"
  | "profile"
  | "superadmin";

export default function FleetDashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const handleNavigation = (view: string) => {
    setCurrentView(view as ViewType);
    setSidebarOpen(false);
  };

  if (!user || !user.permissions) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  const menuItems = [
    { id: "home", label: "Dashboard Principal", icon: Home, permission: true },
    {
      id: "superadmin",
      label: "Super Admin",
      icon: Shield,
      permission: user.permissions.canAccessSuperAdmin || false,
    },
    { id: "profile", label: "Mi Perfil", icon: UserCircle, permission: true },
    {
      id: "map",
      label: "Mapa en Tiempo Real",
      icon: Map,
      permission: user.permissions.canViewMap,
    },
    {
      id: "routes",
      label: "Gestión de Rutas",
      icon: Route,
      permission: user.permissions.canCreateRoutes,
    },
    {
      id: "history",
      label: "Historial de Rutas",
      icon: History,
      permission:
        user.permissions.canViewMap || user.permissions.canCreateRoutes,
    },
    {
      id: "vehicles",
      label: "Gestión de Vehículos",
      icon: Truck,
      permission: user.permissions.canManageVehicles,
    },
    {
      id: "team",
      label: "Gestión de Equipo",
      icon: Users,
      permission: user.permissions.canManageTeam,
    },
    {
      id: "driver",
      label: "Mi Ruta",
      icon: Route,
      permission: user.permissions.canViewOwnRoute,
    },
  ].filter((item) => item.permission);

  const renderView = () => {
    const handleBack = () => setCurrentView("home");

    switch (currentView) {
      case "home":
        return <MainDashboard onNavigate={handleNavigation} />;
      case "superadmin":
        return <SuperAdminView onBack={handleBack} />;
      case "profile":
        return <ProfileView onBack={handleBack} />;
      case "map":
        return <MapView onBack={handleBack} />;
      case "vehicles":
        return <VehiclesManagement onBack={handleBack} />;
      case "routes":
        return <RoutesManagement onBack={handleBack} />;
      case "history":
        return <RouteHistory onBack={handleBack} />;
      case "team":
        return <TeamManagement onBack={handleBack} />;
      case "driver":
        return <DriverView onBack={handleBack} />;
      default:
        return <MainDashboard onNavigate={handleNavigation} />;
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo/Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setCurrentView("home");
                    setSidebarOpen(false);
                  }}
                  className="text-lg text-gray-900 hover:text-[#3271a4] transition-colors"
                >
                  FleetTrack
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  {user?.nombres} {user?.apellidos}
                </p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 p-4 overflow-y-auto">
              <ul className="space-y-1">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                        currentView === item.id
                          ? "bg-[#3271a4] text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
              >
                <LogOut size={18} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="lg:hidden bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-base text-gray-900">FleetTrack</h1>
              <div className="w-10" />
            </div>
          </header>

          {/* View Content */}
          <div className="flex-1 overflow-auto">{renderView()}</div>
        </main>

        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
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
