import { useState } from "react";
import { ArrowLeft, Shield, Users, Database, Download, BarChart3, Eye, EyeOff } from "lucide-react";
import { useAuth, UserRole } from "../../Context/AuthContext";
import { useFleet } from "../../Context/FleetContext";
import { toast } from "sonner";

interface SuperAdminViewProps {
  onBack?: () => void;
}

export function SuperAdminView({ onBack }: SuperAdminViewProps = {}) {
  const { user: currentUser, getAllUsers, updateUserRole, createUser, refreshTeamUsers, teamUsersLoading, teamUsersError } = useAuth();
  const { vehicles, routes, loadErrors, vehiclesLoading, routesLoading, retryFleetData } = useFleet();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "create" | "data">("overview");
  const [isCreating, setIsCreating] = useState(false);

  const [createUserForm, setCreateUserForm] = useState({
    nombres: "",
    apellidos: "",
    usuario: "",
    email: "",
    password: "",
    role: "gerente" as UserRole,
    documentNumber: "",
    phoneNumber: "",
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const users = getAllUsers();
  const isRootAccount = currentUser?.isRootAccount === true;
  const routesLoadFailed = loadErrors.includes("rutas");
  const vehiclesLoadFailed = loadErrors.includes("vehículos");
  const exportDisabled = teamUsersLoading || !!teamUsersError || vehiclesLoading || routesLoading || routesLoadFailed || vehiclesLoadFailed;
  const metricValue = (value: number, loading: boolean, failed: boolean) => failed ? "—" : loading ? "…" : value;

  // Los contextos entregan los recursos visibles para la empresa autenticada.
  const allRoutes = routes;
  const allVehicles = vehicles;

  // Todos los datos provienen del ámbito de empresa entregado por los contextos.
  const stats = {
    totalUsers: users.length,
    managers: users.filter(u => u.role === "gerente").length,
    fleetManagers: users.filter(u => u.role === "manager").length,
    logistics: users.filter(u => u.role === "logistica").length,
    drivers: users.filter(u => u.role === "chofer").length,
    regularUsers: users.filter(u => u.role === "usuario").length,
    totalRoutes: allRoutes.length,
    pendingRoutes: allRoutes.filter((r) => r.estado === "pendiente").length,
    activeRoutes: allRoutes.filter((r) => r.estado === "en_progreso").length,
    completedRoutes: allRoutes.filter((r) => r.estado === "completada").length,
    cancelledRoutes: allRoutes.filter((r) => r.estado === "cancelada").length,
    totalVehicles: allVehicles.length,
    availableVehicles: allVehicles.filter((v) => v.estado === "disponible").length,
    vehiclesOnRoute: allVehicles.filter((v) => v.estado === "en_ruta").length,
    vehiclesInMaintenance: allVehicles.filter((v) => v.estado === "mantenimiento").length,
  };

  const handleCreateUser = async () => {
    if (!createUserForm.nombres.trim() || !createUserForm.apellidos.trim() || !createUserForm.usuario.trim() || !createUserForm.email.trim() || !createUserForm.password) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createUserForm.email.trim())) {
      toast.error("Escribe un correo electrónico válido");
      return;
    }
    if (createUserForm.role === "chofer" && (!createUserForm.documentNumber || !createUserForm.phoneNumber)) {
      toast.error("Para crear un chofer indica documento y teléfono");
      return;
    }

    setIsCreating(true);
    
    const result = await createUser({
      nombres: createUserForm.nombres.trim(),
      apellidos: createUserForm.apellidos.trim(),
      usuario: createUserForm.usuario.trim(),
      email: createUserForm.email.trim(),
      password: createUserForm.password,
      role: createUserForm.role,
      identificacion: createUserForm.documentNumber,
      phoneNumber: createUserForm.phoneNumber,
    });

    setIsCreating(false);

    if (result.ok) {
      let usersRefreshed = true;
      try {
        await refreshTeamUsers();
      } catch {
        usersRefreshed = false;
      }
      toast.success(result.invitationSent ? "Usuario creado y correo enviado" : "Usuario creado. No se pudo enviar el correo de invitación.");
      if (!usersRefreshed) toast.warning("La cuenta se creó, pero no se pudo actualizar la lista de usuarios.");
      setCreateUserForm({
        nombres: "",
        apellidos: "",
        usuario: "",
        email: "",
        password: "",
        role: "gerente",
        documentNumber: "",
        phoneNumber: "",
      });
      setShowCreatePassword(false);
    } else {
      toast.error(result.message ?? "No se pudo crear el usuario. Revisa los datos e inténtalo de nuevo.");
    }
  };

  const handleRoleUpdate = async (userId: string, role: UserRole) => {
    const result = await updateUserRole(userId, role);
    if (result.ok) {
      toast.success("Rol actualizado correctamente");
    } else {
      toast.error(result.message ?? "No se pudo actualizar el rol");
    }
  };

  const handleRetryUsers = async () => {
    try {
      await refreshTeamUsers();
    } catch {
      // El contexto conserva el error para que la vista muestre el estado y el reintento.
    }
  };

  const handleExportData = (timestamp: number) => {
    const data = {
      users,
      routes: allRoutes,
      vehicles: allVehicles,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fletflow-empresa-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Datos exportados exitosamente");
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "superadmin": return "bg-red-100 text-red-800";
      case "gerente": return "bg-blue-100 text-blue-800";
      case "manager": return "bg-cyan-100 text-cyan-800";
      case "logistica": return "bg-purple-100 text-purple-800";
      case "chofer": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "superadmin": return "Administrador";
      case "gerente": return "Gerente";
      case "manager": return "Gestor de flota";
      case "logistica": return "Logística";
      case "chofer": return "Chofer";
      default: return role;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
          <div className="app-container">
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
                <h1 className="text-2xl">Administración de la empresa</h1>
                <p className="text-red-100 text-sm">Usuarios y operación de tu empresa</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-red-100 text-xs mb-1">Administradores</p>
                <p className="text-2xl">{metricValue(stats.managers, teamUsersLoading, !!teamUsersError)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-red-100 text-xs mb-1">Usuarios de la empresa</p>
              <p className="text-2xl">{metricValue(stats.totalUsers, teamUsersLoading, !!teamUsersError)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-red-100 text-xs mb-1">Rutas en curso</p>
              <p className="text-2xl">{metricValue(stats.activeRoutes, routesLoading, routesLoadFailed)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-red-100 text-xs mb-1">Vehículos</p>
              <p className="text-2xl">{metricValue(stats.totalVehicles, vehiclesLoading, vehiclesLoadFailed)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
          <div className="app-container">
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
              Resumen
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
              Usuarios de la empresa
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
          <div className="app-container">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-6 flex items-center gap-2">
                  <BarChart3 size={20} />
                  Operación de la empresa
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm text-gray-600 mb-3">Usuarios</h4>
                    {teamUsersLoading && <p role="status" className="mb-2 text-sm text-gray-500">Cargando usuarios...</p>}
                    {teamUsersError && (
                      <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p>{teamUsersError}</p>
                        <button type="button" onClick={() => void handleRetryUsers()} className="mt-2 font-medium underline">Reintentar</button>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Total</span>
                        <span className="text-lg text-gray-900">{metricValue(stats.totalUsers, teamUsersLoading, !!teamUsersError)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">Gerentes</span>
                        <span className="text-lg text-blue-600">{metricValue(stats.managers, teamUsersLoading, !!teamUsersError)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                        <span className="text-sm text-gray-700">Gestores de flota</span>
                        <span className="text-lg text-cyan-700">{metricValue(stats.fleetManagers, teamUsersLoading, !!teamUsersError)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-700">Logística</span>
                        <span className="text-lg text-purple-600">{metricValue(stats.logistics, teamUsersLoading, !!teamUsersError)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-700">Choferes</span>
                        <span className="text-lg text-green-600">{metricValue(stats.drivers, teamUsersLoading, !!teamUsersError)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Usuarios</span>
                        <span className="text-lg text-gray-900">{metricValue(stats.regularUsers, teamUsersLoading, !!teamUsersError)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm text-gray-600 mb-3">Estado de rutas</h4>
                    {routesLoading && <p role="status" className="mb-2 text-sm text-gray-500">Cargando rutas...</p>}
                    {routesLoadFailed && (
                      <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p>No se pudieron cargar las rutas.</p>
                        <button type="button" onClick={() => void retryFleetData()} className="mt-2 font-medium underline">Reintentar</button>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Total</span>
                        <span className="text-lg text-gray-900">{metricValue(stats.totalRoutes, routesLoading, routesLoadFailed)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <span className="text-sm text-gray-700">Pendientes</span>
                        <span className="text-lg text-yellow-700">{metricValue(stats.pendingRoutes, routesLoading, routesLoadFailed)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">En curso</span>
                        <span className="text-lg text-blue-600">{metricValue(stats.activeRoutes, routesLoading, routesLoadFailed)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-700">Completadas</span>
                        <span className="text-lg text-green-600">{metricValue(stats.completedRoutes, routesLoading, routesLoadFailed)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <span className="text-sm text-gray-700">Canceladas</span>
                        <span className="text-lg text-red-600">{metricValue(stats.cancelledRoutes, routesLoading, routesLoadFailed)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm text-gray-600 mb-3">Estado de vehículos</h4>
                    {vehiclesLoading && <p role="status" className="mb-2 text-sm text-gray-500">Cargando vehículos...</p>}
                    {vehiclesLoadFailed && (
                      <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p>No se pudieron cargar los vehículos.</p>
                        <button type="button" onClick={() => void retryFleetData()} className="mt-2 font-medium underline">Reintentar</button>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Total</span>
                        <span className="text-lg text-gray-900">{metricValue(stats.totalVehicles, vehiclesLoading, vehiclesLoadFailed)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-700">Disponibles</span>
                        <span className="text-lg text-green-600">{metricValue(stats.availableVehicles, vehiclesLoading, vehiclesLoadFailed)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">En ruta</span>
                        <span className="text-lg text-blue-600">{metricValue(stats.vehiclesOnRoute, vehiclesLoading, vehiclesLoadFailed)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <span className="text-sm text-gray-700">En mantenimiento</span>
                        <span className="text-lg text-orange-700">{metricValue(stats.vehiclesInMaintenance, vehiclesLoading, vehiclesLoadFailed)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-lg text-gray-900 mb-4">Usuarios de la empresa</h3>
                {teamUsersLoading ? (
                  <p role="status" className="py-8 text-center text-sm text-gray-500">Cargando usuarios...</p>
                ) : teamUsersError ? (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{teamUsersError}</p>
                    <button type="button" onClick={() => void handleRetryUsers()} className="mt-2 font-medium underline">Reintentar</button>
                  </div>
                ) : users.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">Aún no hay usuarios registrados en la empresa.</p>
                ) : <div className="space-y-3">
                  {users.map((user) => {
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
                              @{user.usuario}{user.identificacion ? ` · ID: ${user.identificacion}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => void handleRoleUpdate(user.id, e.target.value as UserRole)}
                            className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                          >
                            {(isRootAccount || user.role === "superadmin") && (
                              <option value="superadmin" disabled={!isRootAccount}>Administrador</option>
                            )}
                            {(isRootAccount || user.role === "gerente") && (
                              <option value="gerente" disabled={!isRootAccount}>Gerente</option>
                            )}
                            <option value="manager">Gestor de flota</option>
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
                </div>}
              </div>
            </div>
          )}

          {activeTab === "create" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4">Crear Nuevo Usuario</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Crea usuarios de tu empresa. Para choferes, el documento y teléfono son necesarios para crear su perfil operativo.
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
                      <label className="block text-sm text-gray-700 mb-2" htmlFor="company-user-email">Correo electrónico</label>
                      <input
                        id="company-user-email"
                        type="email"
                        autoComplete="email"
                        value={createUserForm.email}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                        placeholder="usuario@empresa.com"
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
                      {([...(isRootAccount ? ["gerente" as const] : []), "manager", "logistica", "chofer"] as UserRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setCreateUserForm({ ...createUserForm, role })}
                          className={`px-3 py-2 rounded-lg border-2 transition-all text-xs ${
                            createUserForm.role === role
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {getRoleLabel(role)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {createUserForm.role === "chofer" && (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-700 mb-2" htmlFor="company-driver-document">Documento *</label>
                          <input id="company-driver-document" value={createUserForm.documentNumber} onChange={(event) => setCreateUserForm({ ...createUserForm, documentNumber: event.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" autoComplete="off" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2" htmlFor="company-driver-phone">Teléfono *</label>
                          <input id="company-driver-phone" value={createUserForm.phoneNumber} onChange={(event) => setCreateUserForm({ ...createUserForm, phoneNumber: event.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" inputMode="tel" autoComplete="tel" />
                        </div>
                      </div>
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
                  Datos de la empresa
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
                          Descarga una copia de los datos disponibles de tu empresa en formato JSON
                        </p>
                        <button
                          onClick={() => handleExportData(Date.now())}
                          disabled={exportDisabled}
                          title={exportDisabled ? "Espera a que carguen correctamente los datos" : undefined}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Exportar Ahora
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Data Summary */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm text-gray-900 mb-3">Resumen de Datos</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Usuarios</p>
                        <p className="text-lg text-gray-900">{metricValue(users.length, teamUsersLoading, !!teamUsersError)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Rutas</p>
                        <p className="text-lg text-gray-900">{metricValue(allRoutes.length, routesLoading, routesLoadFailed)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Vehículos</p>
                        <p className="text-lg text-gray-900">{metricValue(allVehicles.length, vehiclesLoading, vehiclesLoadFailed)}</p>
                      </div>
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
