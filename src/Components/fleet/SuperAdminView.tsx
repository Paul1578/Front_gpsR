import { useState } from "react";
import { ArrowLeft, Shield, Users, Database, Activity, Download, Upload, AlertTriangle, BarChart3, Building2, Eye, EyeOff } from "lucide-react";
import { useAuth, UserRole } from "../../Context/AuthContext";
import { toast } from "sonner";
import { TeamDetailsView } from "./TeamDetailsView";

interface SuperAdminViewProps {
  onBack?: () => void;
}

export function SuperAdminView({ onBack }: SuperAdminViewProps = {}) {
  const { getAllUsers, updateUserRole, getManagers, createUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "teams" | "users" | "create" | "data" | "logs">("overview");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [createUserForm, setCreateUserForm] = useState({
    nombres: "",
    apellidos: "",
    usuario: "",
    password: "",
    role: "gerente" as UserRole,
    teamId: "",
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const users = getAllUsers();
  const managers = getManagers();

  // Obtener todas las rutas y vehículos del sistema (sin filtro de equipo)
  const allRoutes = JSON.parse(localStorage.getItem("routes") || "[]");
  const allVehicles = JSON.parse(localStorage.getItem("vehicles") || "[]");

  // Estadísticas del sistema para uso/actividad
  const stats = {
    totalUsers: users.length,
    superAdmins: users.filter(u => u.role === "superadmin").length,
    managers: users.filter(u => u.role === "gerente").length,
    logistics: users.filter(u => u.role === "logistica").length,
    drivers: users.filter(u => u.role === "chofer").length,
    totalRoutes: allRoutes.length,
    activeRoutes: allRoutes.filter((r: any) => r.estado === "en_progreso").length,
    completedRoutes: allRoutes.filter((r: any) => r.estado === "completada").length,
    totalVehicles: allVehicles.length,
    activeVehicles: allVehicles.filter((v: any) => v.estado === "en_ruta").length,
    totalTeams: managers.length,
  };

  // Si hay un equipo seleccionado, mostrar la vista de detalles
  if (selectedTeamId) {
    return <TeamDetailsView teamId={selectedTeamId} onBack={() => setSelectedTeamId(null)} />;
  }

  const handleCreateUser = async () => {
    if (!createUserForm.nombres || !createUserForm.apellidos || !createUserForm.usuario || !createUserForm.password) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    // Si el rol no es gerente ni superadmin, debe seleccionar un equipo
    if (createUserForm.role !== "gerente" && createUserForm.role !== "superadmin" && !createUserForm.teamId) {
      toast.error("Debes seleccionar un equipo para este usuario");
      return;
    }

    setIsCreating(true);
    
    const success = await createUser({
      ...createUserForm,
      teamId: createUserForm.role === "gerente" || createUserForm.role === "superadmin" ? undefined : createUserForm.teamId,
    });

    setIsCreating(false);

    if (success) {
      toast.success("Usuario creado exitosamente");
      setCreateUserForm({
        nombres: "",
        apellidos: "",
        usuario: "",
        password: "",
        role: "gerente",
        teamId: "",
      });
      setShowCreatePassword(false);
    } else {
      toast.error("Error al crear usuario. El nombre de usuario podría estar en uso.");
    }
  };

  const handleExportData = () => {
    const data = {
      users: localStorage.getItem("users"),
      routes: localStorage.getItem("routes"),
      vehicles: localStorage.getItem("vehicles"),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleettrack-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Datos exportados exitosamente");
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.users) localStorage.setItem("users", data.users);
        if (data.routes) localStorage.setItem("routes", data.routes);
        if (data.vehicles) localStorage.setItem("vehicles", data.vehicles);

        toast.success("Datos importados exitosamente. Recarga la página.");
      } catch (error) {
        toast.error("Error al importar datos. Verifica el archivo.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetSystem = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    localStorage.removeItem("users");
    localStorage.removeItem("routes");
    localStorage.removeItem("vehicles");
    localStorage.removeItem("currentUser");
    
    toast.success("Sistema reiniciado. Recargando...");
    setTimeout(() => window.location.reload(), 1500);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "superadmin": return "bg-red-100 text-red-800";
      case "gerente": return "bg-blue-100 text-blue-800";
      case "logistica": return "bg-purple-100 text-purple-800";
      case "chofer": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "superadmin": return "Super Admin";
      case "gerente": return "Gerente";
      case "logistica": return "Logística";
      case "chofer": return "Chofer";
      default: return role;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Shield size={24} />
              </div>
              <div>
                <h1 className="text-2xl">Panel Super Admin</h1>
                <p className="text-red-100 text-sm">Administración del Sistema FleetTrack</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-red-100 text-xs mb-1">Total Equipos</p>
              <p className="text-2xl">{stats.totalTeams}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-red-100 text-xs mb-1">Total Usuarios</p>
              <p className="text-2xl">{stats.totalUsers}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-red-100 text-xs mb-1">Rutas Activas</p>
              <p className="text-2xl">{stats.activeRoutes}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-red-100 text-xs mb-1">Vehículos Totales</p>
              <p className="text-2xl">{stats.totalVehicles}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <BarChart3 size={18} />
              Estadísticas de Uso
            </button>
            <button
              onClick={() => setActiveTab("teams")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "teams"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Building2 size={18} />
              Equipos
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "users"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users size={18} />
              Todos los Usuarios
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "create"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users size={18} />
              Crear Usuario
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "data"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Database size={18} />
              Gestión de Datos
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "logs"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Activity size={18} />
              Actividad del Sistema
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-6 flex items-center gap-2">
                  <BarChart3 size={20} />
                  Estadísticas de Uso del Sistema
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Usuarios */}
                  <div>
                    <h4 className="text-sm text-gray-600 mb-3">Distribución de Usuarios</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <span className="text-sm text-gray-700">Super Admins</span>
                        <span className="text-lg text-red-600">{stats.superAdmins}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">Gerentes</span>
                        <span className="text-lg text-blue-600">{stats.managers}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-700">Logística</span>
                        <span className="text-lg text-purple-600">{stats.logistics}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-700">Choferes</span>
                        <span className="text-lg text-green-600">{stats.drivers}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rutas */}
                  <div>
                    <h4 className="text-sm text-gray-600 mb-3">Estado de Rutas</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Total</span>
                        <span className="text-lg text-gray-900">{stats.totalRoutes}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">En Progreso</span>
                        <span className="text-lg text-blue-600">{stats.activeRoutes}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-700">Completadas</span>
                        <span className="text-lg text-green-600">{stats.completedRoutes}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <span className="text-sm text-gray-700">Pendientes</span>
                        <span className="text-lg text-yellow-600">
                          {stats.totalRoutes - stats.activeRoutes - stats.completedRoutes}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vehículos */}
                  <div>
                    <h4 className="text-sm text-gray-600 mb-3">Estado de Vehículos</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Total</span>
                        <span className="text-lg text-gray-900">{stats.totalVehicles}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">En Ruta</span>
                        <span className="text-lg text-blue-600">{stats.activeVehicles}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-700">Disponibles</span>
                        <span className="text-lg text-green-600">
                          {stats.totalVehicles - stats.activeVehicles}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-sm text-gray-600 mb-3">Información del Sistema</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Versión</span>
                      <span className="text-sm text-gray-900">FleetTrack v1.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Estado</span>
                      <span className="text-sm text-green-600">Operativo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Equipos Activos</span>
                      <span className="text-sm text-gray-900">{stats.totalTeams}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-sm text-gray-600 mb-3">Almacenamiento</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Usuarios</span>
                      <span className="text-sm text-gray-900">{users.length} registros</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Rutas</span>
                      <span className="text-sm text-gray-900">{allRoutes.length} registros</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Vehículos</span>
                      <span className="text-sm text-gray-900">{allVehicles.length} registros</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "teams" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-lg text-gray-900 mb-4">
                  Equipos Registrados ({managers.length})
                </h3>
                {managers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No hay equipos registrados aún
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {managers.map((manager) => {
                      const teamMembers = users.filter(u => u.teamId === manager.id);
                      const teamVehicles = allVehicles.filter((v: any) => v.teamId === manager.id);
                      const teamRoutes = allRoutes.filter((r: any) => r.teamId === manager.id);
                      
                      return (
                        <button
                          key={manager.id}
                          onClick={() => setSelectedTeamId(manager.id)}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-600 hover:bg-red-50 transition-all text-left"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white">
                              {manager.nombres.charAt(0)}
                              {manager.apellidos.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">
                                {manager.teamName || `Equipo de ${manager.nombres}`}
                              </p>
                              <p className="text-xs text-gray-600">
                                Gerente: {manager.nombres} {manager.apellidos}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-xs text-blue-600">Miembros</p>
                              <p className="text-sm text-blue-900">{teamMembers.length}</p>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                              <p className="text-xs text-green-600">Vehículos</p>
                              <p className="text-sm text-green-900">{teamVehicles.length}</p>
                            </div>
                            <div className="bg-purple-50 rounded p-2">
                              <p className="text-xs text-purple-600">Rutas</p>
                              <p className="text-sm text-purple-900">{teamRoutes.length}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-lg text-gray-900 mb-4">Todos los Usuarios del Sistema</h3>
                <div className="space-y-3">
                  {users.map((user) => {
                    const manager = user.teamId ? users.find(u => u.id === user.teamId) : null;
                    
                    return (
                      <div
                        key={user.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm ${
                            user.role === "superadmin" ? "bg-gradient-to-br from-red-600 to-red-700" :
                            user.role === "gerente" ? "bg-gradient-to-br from-blue-600 to-blue-700" :
                            "bg-gradient-to-br from-gray-600 to-gray-700"
                          }`}>
                            {user.nombres.charAt(0)}
                            {user.apellidos.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">
                              {user.nombres} {user.apellidos}
                            </p>
                            <p className="text-xs text-gray-500">
                              @{user.usuario} · ID: {user.identificacion}
                              {manager && ` · Equipo: ${manager.teamName || manager.nombres}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(e) =>
                              updateUserRole(user.id, e.target.value as UserRole)
                            }
                            className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                          >
                            <option value="superadmin">Super Admin</option>
                            <option value="gerente">Gerente</option>
                            <option value="logistica">Logística</option>
                            <option value="chofer">Chofer</option>
                          </select>
                          <span
                            className={`px-2 py-1 rounded text-xs whitespace-nowrap ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "create" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4">Crear Nuevo Usuario</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Como Super Admin, puedes crear usuarios asignándolos a equipos específicos.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Nombres</label>
                      <input
                        type="text"
                        value={createUserForm.nombres}
                        onChange={(e) =>
                          setCreateUserForm({ ...createUserForm, nombres: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                        placeholder="Juan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Apellidos</label>
                      <input
                        type="text"
                        value={createUserForm.apellidos}
                        onChange={(e) =>
                          setCreateUserForm({ ...createUserForm, apellidos: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                        placeholder="Pérez"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Usuario</label>
                      <input
                        type="text"
                        value={createUserForm.usuario}
                        onChange={(e) =>
                          setCreateUserForm({ ...createUserForm, usuario: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                        placeholder="jperez"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Contraseña</label>
                      <div className="relative">
                        <input
                          type={showCreatePassword ? "text" : "password"}
                          value={createUserForm.password}
                          onChange={(e) =>
                            setCreateUserForm({ ...createUserForm, password: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm pr-10"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatePassword((prev) => !prev)}
                          className="absolute inset-y-0 right-2 flex items-center text-red-600/80 hover:text-red-700"
                          aria-label={showCreatePassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Rol</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["superadmin", "gerente", "logistica", "chofer"] as UserRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setCreateUserForm({ ...createUserForm, role, teamId: role === "gerente" || role === "superadmin" ? "" : createUserForm.teamId })}
                          className={`px-3 py-2 rounded-lg border-2 transition-all text-xs ${
                            createUserForm.role === role
                              ? role === "superadmin"
                                ? "border-red-600 bg-red-600 text-white"
                                : "border-red-600 bg-red-600 text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {role === "superadmin" ? "Super Admin" : role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {createUserForm.role !== "gerente" && createUserForm.role !== "superadmin" && (
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Equipo (Gerente) *
                      </label>
                      <select
                        value={createUserForm.teamId}
                        onChange={(e) =>
                          setCreateUserForm({ ...createUserForm, teamId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                      >
                        <option value="">Seleccionar equipo...</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.teamName || `Equipo de ${manager.nombres} ${manager.apellidos}`} (@{manager.usuario})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Selecciona el gerente al que pertenecerá este usuario
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleCreateUser}
                      disabled={isCreating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                    >
                      {isCreating ? "Creando..." : "Crear Usuario"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <Database size={20} />
                  Gestión de Datos del Sistema
                </h3>

                <div className="space-y-4">
                  {/* Export Data */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Download size={20} className="text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm text-gray-900 mb-1">
                          Exportar Datos
                        </h4>
                        <p className="text-xs text-gray-600 mb-3">
                          Descarga una copia de seguridad completa del sistema en formato JSON
                        </p>
                        <button
                          onClick={handleExportData}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Exportar Ahora
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Import Data */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Upload size={20} className="text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm text-gray-900 mb-1">
                          Importar Datos
                        </h4>
                        <p className="text-xs text-gray-600 mb-3">
                          Restaura el sistema desde un archivo de respaldo JSON
                        </p>
                        <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm cursor-pointer inline-block">
                          Seleccionar Archivo
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportData}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Reset System */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm text-gray-900 mb-1">
                          Reiniciar Sistema
                        </h4>
                        <p className="text-xs text-gray-600 mb-3">
                          Elimina todos los datos del sistema. Esta acción no se puede deshacer.
                        </p>
                        {!showResetConfirm ? (
                          <button
                            onClick={handleResetSystem}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            Reiniciar Sistema
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={handleResetSystem}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Confirmar Reinicio
                            </button>
                            <button
                              onClick={() => setShowResetConfirm(false)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Data Summary */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm text-gray-900 mb-3">Resumen de Datos</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Usuarios</p>
                        <p className="text-lg text-gray-900">{users.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Rutas</p>
                        <p className="text-lg text-gray-900">{allRoutes.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Vehículos</p>
                        <p className="text-lg text-gray-900">{allVehicles.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
                <Activity size={20} />
                Actividad del Sistema
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">Sistema iniciado</p>
                      <p className="text-xs text-gray-500">{new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">
                        {stats.totalUsers} usuarios registrados
                      </p>
                      <p className="text-xs text-gray-500">Estado actual</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">
                        {stats.activeRoutes} rutas activas en el sistema
                      </p>
                      <p className="text-xs text-gray-500">En progreso</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
