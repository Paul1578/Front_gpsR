import { useFleet } from "../../Context/FleetContext";
import { useAuth } from "../../Context/AuthContext";
import { Map, Truck, Route, Users, Activity, TrendingUp, Clock, CheckCircle, History, Shield } from "lucide-react";
import { ViewType } from "../FleetDashboard";


interface MainDashboardProps {
  onNavigate: (view: ViewType) => void;
}

export function MainDashboard({ onNavigate }: MainDashboardProps) {
  const { vehicles, routes } = useFleet();
  const { user, getAllUsers } = useAuth();

  const users = getAllUsers();
  const activeRoutes = routes.filter(r => r.estado === "en_progreso");
  const pendingRoutes = routes.filter(r => r.estado === "pendiente");
  const completedRoutes = routes.filter(r => r.estado === "completada");
  const availableVehicles = vehicles.filter(v => v.estado === "disponible");
  const vehiclesInRoute = vehicles.filter(v => v.estado === "en_ruta");

  // Si es Super Admin, mostrar dashboard especial
  if (user?.role === "superadmin") {
    const allUsers = getAllUsers();
    const allRoutes = routes;
    const allVehicles = vehicles;
    
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Usuarios</p>
                    <p className="text-2xl text-gray-900">{allUsers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Route size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Rutas</p>
                    <p className="text-2xl text-gray-900">{allRoutes.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Truck size={24} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Vehículos</p>
                    <p className="text-2xl text-gray-900">{allVehicles.length}</p>
                  </div>
                </div>
              </div>
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
                    Como Super Admin, eres el administrador del sistema. Puedes gestionar todos los usuarios,
                    exportar datos y configurar el sistema.
                  </p>
                  <p className="text-red-100 mb-4">
                    Para crear rutas o gestionar vehículos, los gerentes de cada equipo deben hacerlo desde sus
                    propias cuentas. Usa el Panel Super Admin para gestionar usuarios y equipos.
                  </p>
                  <button
                    onClick={() => onNavigate("superadmin")}
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

  const quickActions: {
  id: ViewType; // <- cambiar de string a ViewType
  title: string;
  description: string;
  icon: typeof Shield;
  color: string;
  permission: boolean | undefined;
  stats: string;
}[] = [
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
    id: "history",
    title: "Historial de Rutas",
    description: "Revisa todas las rutas completadas y sus evidencias",
    icon: History,
    color: "from-indigo-500 to-indigo-600",
    permission: user?.permissions.canViewMap || user?.permissions.canCreateRoutes,
    stats: `${completedRoutes.length} completadas`,
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
].filter((action): action is typeof action & { id: ViewType } => !!action.permission);

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

  // Para choferes, mostrar su dashboard específico
  if (user?.role === "chofer" && user?.permissions.canViewOwnRoute && !user?.permissions.canViewMap) {
    const myRoutes = routes.filter(r => r.conductorId === user?.id);
    const myActiveRoute = myRoutes.find(r => r.estado === "en_progreso" || r.estado === "pendiente");

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl text-gray-900 mb-2">
                Bienvenido, {user?.nombres} 👋
              </h1>
              <p className="text-gray-600">
                Panel de control del conductor
                {user?.teamId && users.find(u => u.id === user.teamId)?.teamName && 
                  ` · ${users.find(u => u.id === user.teamId)?.teamName}`}
              </p>
            </div>

            {/* Ruta activa o mensaje */}
            {myActiveRoute ? (
              <div className="mb-6">
                <button
                  onClick={() => onNavigate("driver")}
                  className="w-full p-6 bg-gradient-to-r from-[#3271a4] to-[#4384d8] text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg">Ruta Activa</h3>
                    <span className="px-3 py-1 bg-white/20 rounded-lg text-sm">
                      {myActiveRoute.estado === "en_progreso" ? "En Curso" : "Pendiente"}
                    </span>
                  </div>
                  <p className="text-xl mb-2">{myActiveRoute.nombre}</p>
                  <p className="text-sm opacity-90">Click para ver detalles →</p>
                </button>
              </div>
            ) : (
              <div className="mb-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="text-center py-4">
                  <Route size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No tienes rutas asignadas actualmente</p>
                </div>
              </div>
            )}

            {/* Estadísticas del chofer */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Completadas</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {myRoutes.filter(r => r.estado === "completada").length}
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity size={20} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Total Rutas</p>
                <p className="text-2xl text-gray-900 mt-1">{myRoutes.length}</p>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200 col-span-2 md:col-span-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp size={20} className="text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Rendimiento</p>
                <p className="text-2xl text-gray-900 mt-1">Excelente</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl text-gray-900 mb-2">
              Bienvenido, {user?.nombres} 👋
            </h1>
            <p className="text-gray-600">
              {user?.role === "gerente" && user?.teamName 
                ? `${user.teamName} · Administra tu flota de vehículos y rutas`
                : "Administra tu flota de vehículos y rutas desde un solo lugar"}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="p-4 md:p-5 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon size={20} className="md:w-6 md:h-6" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl md:text-3xl text-gray-900 mb-2">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg md:text-xl text-gray-900 mb-4">Accesos Rápidos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onNavigate(action.id)}
                  className="group p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all text-left relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${action.color} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform`} />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <action.icon size={24} className="text-white md:w-7 md:h-7" />
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                        {action.stats}
                      </span>
                    </div>
                    
                    <h3 className="text-base md:text-lg text-gray-900 mb-2 group-hover:text-[#3271a4] transition-colors">
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

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg md:text-xl text-gray-900 mb-4">Actividad Reciente</h2>
            
            {routes.length === 0 ? (
              <div className="text-center py-8">
                <Activity size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No hay actividad reciente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {routes.slice(0, 5).map((route) => {
                  const vehicle = vehicles.find(v => v.id === route.vehiculoId);
                  const driver = users.find(u => u.id === route.conductorId);
                  
                  return (
                    <div
                      key={route.id}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        route.estado === "completada" ? "bg-green-100" :
                        route.estado === "en_progreso" ? "bg-blue-100" :
                        route.estado === "pendiente" ? "bg-yellow-100" :
                        "bg-gray-100"
                      }`}>
                        {route.estado === "completada" ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : route.estado === "en_progreso" ? (
                          <Activity size={20} className="text-blue-600" />
                        ) : (
                          <Clock size={20} className="text-yellow-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{route.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {vehicle?.placa} • {driver?.nombres} {driver?.apellidos}
                        </p>
                      </div>
                      
                      <span className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                        route.estado === "completada" ? "bg-green-100 text-green-700" :
                        route.estado === "en_progreso" ? "bg-blue-100 text-blue-700" :
                        route.estado === "pendiente" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {route.estado === "completada" ? "Completada" :
                         route.estado === "en_progreso" ? "En Progreso" :
                         route.estado === "pendiente" ? "Pendiente" : "Cancelada"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
