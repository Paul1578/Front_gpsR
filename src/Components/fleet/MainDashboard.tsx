"use client";

import { useFleet } from "@/context/FleetContext";
import { useAuth } from "@/context/AuthContext";
import {
  Map,
  Truck,
  Route,
  Users,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  History,
  Shield,
} from "lucide-react";

interface MainDashboardProps {
  onNavigate?: (view: string) => void;
}

export default function MainDashboard({ onNavigate }: MainDashboardProps) {
  const { vehicles, routes } = useFleet();
  const { user, getAllUsers } = useAuth();

  const users = getAllUsers();
  const activeRoutes = routes.filter((r) => r.estado === "en_progreso");
  const pendingRoutes = routes.filter((r) => r.estado === "pendiente");
  const completedRoutes = routes.filter((r) => r.estado === "completada");
  const availableVehicles = vehicles.filter((v) => v.estado === "disponible");
  const vehiclesInRoute = vehicles.filter((v) => v.estado === "en_ruta");

  // Si es Super Admin, mostrar dashboard especial
  if (user?.role === "superadmin") {
    const allUsers = getAllUsers();
    const allRoutes = JSON.parse(localStorage.getItem("routes") || "[]");
    const allVehicles = JSON.parse(localStorage.getItem("vehicles") || "[]");

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-700 mb-4">
                <Shield size={40} className="text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl text-gray-900 mb-2">
                Bienvenido Super Admin, {user?.nombres} 👋
              </h1>
              <p className="text-gray-600">
                Panel de administración del sistema FleetTrack
              </p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                {
                  icon: <Users size={24} className="text-blue-600" />,
                  label: "Total Usuarios",
                  value: allUsers.length,
                  bg: "bg-blue-100",
                },
                {
                  icon: <Route size={24} className="text-purple-600" />,
                  label: "Total Rutas",
                  value: allRoutes.length,
                  bg: "bg-purple-100",
                },
                {
                  icon: <Truck size={24} className="text-green-600" />,
                  label: "Total Vehículos",
                  value: allVehicles.length,
                  bg: "bg-green-100",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4"
                >
                  <div
                    className={`w-12 h-12 rounded-lg ${item.bg} flex items-center justify-center`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{item.label}</p>
                    <p className="text-2xl text-gray-900">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Notice */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl p-8 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-lg mb-2">Panel de Super Admin</h3>
                  <p className="text-red-100 mb-4">
                    Como Super Admin, eres el administrador del sistema. Puedes
                    gestionar todos los usuarios, exportar datos y configurar el
                    sistema.
                  </p>
                  <p className="text-red-100 mb-4">
                    Para crear rutas o gestionar vehículos, los gerentes deben
                    hacerlo desde sus propias cuentas.
                  </p>
                  <button
                    onClick={() => onNavigate?.("superadmin")}
                    className="px-6 py-3 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Ir al Panel Super Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      id: "superadmin",
      title: "Panel Super Admin",
      description: "Acceso completo a la administración del sistema",
      icon: Shield,
      color: "from-red-500 to-red-600",
      permission: user?.permissions.canAccessSuperAdmin,
      stats: "Acceso total",
    },
    {
      id: "map",
      title: "Mapa en Tiempo Real",
      description: "Monitorea tus vehículos y rutas en tiempo real",
      icon: Map,
      color: "from-blue-500 to-blue-600",
      permission: user?.permissions.canViewMap,
      stats: `${activeRoutes.length} activas`,
    },
    {
      id: "routes",
      title: "Gestión de Rutas",
      description: "Crea y administra rutas de entrega",
      icon: Route,
      color: "from-purple-500 to-purple-600",
      permission: user?.permissions.canCreateRoutes,
      stats: `${routes.length} total`,
    },
    {
      id: "vehicles",
      title: "Gestión de Vehículos",
      description: "Administra tu flota de vehículos",
      icon: Truck,
      color: "from-green-500 to-green-600",
      permission: user?.permissions.canManageVehicles,
      stats: `${vehicles.length} vehículos`,
    },
    {
      id: "team",
      title: "Gestión de Equipo",
      description: "Administra roles y permisos",
      icon: Users,
      color: "from-orange-500 to-orange-600",
      permission: user?.permissions.canManageTeam,
      stats: `${users.length} miembros`,
    },
  ].filter((action) => action.permission);

  const stats = [
    {
      label: "Rutas Activas",
      value: activeRoutes.length,
      icon: Activity,
      color: "bg-blue-100 text-blue-600",
      change: "+12%",
    },
    {
      label: "Vehículos Disponibles",
      value: availableVehicles.length,
      icon: Truck,
      color: "bg-green-100 text-green-600",
      change: `${vehiclesInRoute.length} en ruta`,
    },
    {
      label: "Rutas Pendientes",
      value: pendingRoutes.length,
      icon: Clock,
      color: "bg-yellow-100 text-yellow-600",
      change: "Por iniciar",
    },
    {
      label: "Completadas Hoy",
      value: completedRoutes.length,
      icon: CheckCircle,
      color: "bg-purple-100 text-purple-600",
      change: "+8 esta semana",
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl text-gray-900 mb-2">
              Bienvenido, {user?.nombres} 👋
            </h1>
            <p className="text-gray-600">
              {user?.role === "gerente" && user?.teamName
                ? `${user.teamName} · Administra tu flota`
                : "Administra tu flota de vehículos y rutas desde un solo lugar"}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}
                  >
                    <stat.icon size={20} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onNavigate?.(action.id)}
                className="group p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all text-left relative overflow-hidden"
              >
                <div
                  className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${action.color} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform`}
                />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <action.icon size={24} className="text-white" />
                    </div>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                      {action.stats}
                    </span>
                  </div>
                  <h3 className="text-base text-gray-900 mb-2 group-hover:text-[#3271a4] transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {action.description}
                  </p>
                  <div className="flex items-center text-[#3271a4] text-sm group-hover:gap-2 transition-all">
                    <span>Abrir</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
