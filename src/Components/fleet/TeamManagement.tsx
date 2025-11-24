import { useEffect, useState } from "react";
import { useAuth, UserRole, UserPermissions } from "../../Context/AuthContext";
import { Users, Shield, Check, ArrowLeft, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";

interface TeamManagementProps {
  onBack?: () => void;
}

export function TeamManagement({ onBack }: TeamManagementProps = {}) {
  const {
    getTeamUsers,
    refreshTeamUsers,
    updateUserRole,
    updateUserPermissions,
    updateUserStatus,
    createUser,
    isSuperAdmin,
  } = useAuth();

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  const users = getTeamUsers();

  useEffect(() => {
    setIsLoadingTeam(true);
    void (async () => {
      await refreshTeamUsers();
      setIsLoadingTeam(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [permissionsForm, setPermissionsForm] = useState<UserPermissions>({
    canViewMap: false,
    canCreateRoutes: false,
    canManageVehicles: false,
    canManageTeam: false,
    canViewOwnRoute: false,
  });

  const [createUserForm, setCreateUserForm] = useState({
    usuario: "",
    email: "",
    role: "chofer" as UserRole,
  });

  const openCreateUserDialog = () => {
    setShowCreateUser(true);
  };

  const closeCreateUserDialog = () => {
    setShowCreateUser(false);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    await updateUserRole(userId, newRole);
    toast.success("Rol actualizado exitosamente");
  };

  const handleEditPermissions = (user: any) => {
    setEditingUser(user);
    setPermissionsForm(user.permissions);
    setShowPermissions(true);
  };

  const handleSavePermissions = () => {
    if (editingUser) {
      updateUserPermissions(editingUser.id, permissionsForm);
      toast.success("Permisos actualizados exitosamente");
      setShowPermissions(false);
      setEditingUser(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createUserForm.usuario || !createUserForm.email) {
      toast.error("Por favor completa usuario y correo");
      return;
    }

    setIsCreating(true);

    const success = await createUser({
      nombres: "",
      apellidos: "",
      identificacion: "",
      usuario: createUserForm.usuario,
      email: createUserForm.email,
      role: createUserForm.role,
      teamId: undefined,
    });

    setIsCreating(false);

    if (success) {
      toast.success("Usuario creado exitosamente");
      closeCreateUserDialog();
      await refreshTeamUsers();
      setCreateUserForm({
        usuario: "",
        email: "",
        role: "chofer",
      });
    } else {
      toast.error("El nombre de usuario ya existe");
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const styles = {
      superadmin: "bg-red-100 text-red-700",
      gerente: "bg-purple-100 text-purple-700",
      logistica: "bg-blue-100 text-blue-700",
      chofer: "bg-green-100 text-green-700",
    };
    const labels = {
      superadmin: "Super Admin",
      gerente: "Gerente",
      logistica: "Logística",
      chofer: "Chofer",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const permissionLabels = {
    canViewMap: "Ver Mapa en Tiempo Real",
    canCreateRoutes: "Crear y Gestionar Rutas",
    canManageVehicles: "Gestionar Vehículos",
    canManageTeam: "Gestionar Equipo",
    canViewOwnRoute: "Ver Su Propia Ruta",
    canAccessSuperAdmin: "Acceso a Panel Super Admin",
    canManageAllOrganizations: "Gestionar Todas las Organizaciones",
    canViewSystemLogs: "Ver Logs del Sistema",
    canExportData: "Exportar Datos del Sistema",
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
              )}
              <div>
                <h2 className="text-xl md:text-2xl text-gray-900">Gestión de Equipo</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Administra roles y permisos de tu equipo
                </p>
              </div>
            </div>
            <button
              onClick={openCreateUserDialog}
              className="flex items-center gap-2 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm"
            >
              <Plus size={16} />
              Crear Usuario
            </button>
          </div>
        </div>

        {/* Team List */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {isLoadingTeam ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              Cargando equipo...
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No hay otros miembros en el equipo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#3271a4] to-[#4384d8] rounded-full flex items-center justify-center text-white flex-shrink-0 text-sm">
                        {user.nombres.charAt(0)}{user.apellidos.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base text-gray-900">
                          {user.nombres} {user.apellidos}
                        </h3>
                        <p className="text-xs text-gray-500">@{user.usuario}</p>
                        {user.identificacion && (
                          <p className="text-xs text-gray-400 mt-0.5">ID: {user.identificacion}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const next = !user.isActive;
                          void updateUserStatus(user.id, next);
                          toast.success(`Usuario ${next ? "activado" : "desactivado"}`);
                        }}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                      >
                        {user.isActive ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                        )}
                        {user.isActive ? "Activo" : "Inactivo"}
                      </button>
                      {getRoleBadge(user.role)}
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-2">Rol</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(isSuperAdmin()
                        ? (["superadmin", "gerente", "logistica", "chofer"] as UserRole[])
                        : (["gerente", "logistica", "chofer"] as UserRole[])
                      ).map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleChange(user.id, role)}
                          className={`px-3 py-2 rounded-lg border-2 transition-all text-xs ${
                            user.role === role
                              ? role === "superadmin"
                                ? "border-red-600 bg-red-600 text-white"
                                : "border-[#3271a4] bg-[#3271a4] text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {role === "superadmin" ? "Super Admin" : role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Permissions Summary */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-2">Permisos Activos</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(user.permissions)
                        .filter(([_, value]) => value)
                        .map(([key]) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs flex items-center gap-1"
                          >
                            <Check size={12} />
                            {permissionLabels[key as keyof UserPermissions]}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Edit Permissions Button */}
                  <button
                    onClick={() => handleEditPermissions(user)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <Shield size={14} />
                    Editar Permisos
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Permissions Dialog */}
      <Dialog open={showPermissions} onOpenChange={() => setShowPermissions(false)}>
        <DialogContent className="sm:max-w-md max-w-[90%]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Editar Permisos - {editingUser?.nombres} {editingUser?.apellidos}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-500">
              Selecciona los permisos específicos para este usuario
            </p>

            {Object.entries(permissionLabels).map(([key, label]) => (
              <label
                key={key}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={permissionsForm[key as keyof UserPermissions]}
                  onChange={(e) =>
                    setPermissionsForm({
                      ...permissionsForm,
                      [key]: e.target.checked,
                    })
                  }
                  className="mt-0.5 w-4 h-4 text-[#3271a4] border-gray-300 rounded focus:ring-[#3271a4]"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {key === "canViewMap" && "Permite ver el mapa con todas las rutas en tiempo real"}
                    {key === "canCreateRoutes" && "Permite crear, editar y eliminar rutas"}
                    {key === "canManageVehicles" && "Permite gestionar el CRUD completo de vehículos"}
                    {key === "canManageTeam" && "Permite gestionar roles y permisos del equipo"}
                    {key === "canViewOwnRoute" && "Permite ver solo la ruta asignada al usuario"}
                    {key === "canAccessSuperAdmin" && "Acceso completo al panel de administración del sistema"}
                    {key === "canManageAllOrganizations" && "Gestionar usuarios y datos de todas las organizaciones"}
                    {key === "canViewSystemLogs" && "Ver registros de actividad y eventos del sistema"}
                    {key === "canExportData" && "Exportar e importar datos del sistema"}
                  </p>
                </div>
              </label>
            ))}

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowPermissions(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePermissions}
                className="flex-1 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm"
              >
                Guardar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog
        open={showCreateUser}
        onOpenChange={(open) => {
          if (!open) closeCreateUserDialog();
        }}
      >
        <DialogContent className="sm:max-w-md max-w-[90%]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                value={createUserForm.usuario}
                onChange={(e) => setCreateUserForm({ ...createUserForm, usuario: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3271a4] focus:border-transparent text-sm"
                placeholder="jperez"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={createUserForm.email}
                onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3271a4] focus:border-transparent text-sm"
                placeholder="jperez@empresa.com"
              />
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-sm px-3 py-2">
              El usuario recibirá un correo con un enlace para activar su cuenta.
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm text-gray-700">Rol</label>
                <span className="text-xs text-gray-500">Selecciona el rol para el nuevo usuario</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(isSuperAdmin()
                  ? (["superadmin", "gerente", "logistica", "chofer"] as UserRole[])
                  : (["gerente", "logistica", "chofer"] as UserRole[])
                ).map((role) => {
                  const active = createUserForm.role === role;
                  const roleLabel =
                    role === "superadmin" ? "Super Admin" : role.charAt(0).toUpperCase() + role.slice(1);
                  const roleInfo =
                    role === "superadmin"
                      ? "Control total del sistema"
                      : role === "gerente"
                      ? "Administra equipos y rutas"
                      : role === "logistica"
                      ? "Gestiona operaciones diarias"
                      : "Conduce y reporta";
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setCreateUserForm({ ...createUserForm, role })}
                      className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left shadow-sm transition-all ${
                        active
                          ? "border-[#3271a4] bg-gradient-to-r from-[#3271a4] to-[#4384d8] text-white shadow-md"
                          : "border-gray-200 bg-white hover:border-[#3271a4]/50 hover:shadow"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${active ? "text-white" : "text-gray-900"}`}>
                        {roleLabel}
                      </span>
                      <span className={`text-xs ${active ? "text-white/80" : "text-gray-500"}`}>{roleInfo}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={closeCreateUserDialog}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creando..." : "Crear Usuario"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
