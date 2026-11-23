import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, UserRole, UserPermissions } from "../../Context/AuthContext";
import { useFleet } from "../../Context/FleetContext";
import { Check, ArrowLeft, Plus, ToggleLeft, ToggleRight, Truck, Pencil, Search, UserRoundX } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "sonner";
import { ServerPagination } from "../ui/ServerPagination";

interface TeamManagementProps {
  onBack?: () => void;
}

type MemberConfirmation =
  | { kind: "role"; userId: string; memberName: string; currentRole: UserRole; nextRole: UserRole }
  | { kind: "status"; userId: string; memberName: string; nextActive: boolean }
  | { kind: "driver-unlink"; driverId: string; memberName: string };

const roleLabels: Record<UserRole, string> = {
  superadmin: "Super Admin",
  gerente: "Gerente",
  manager: "Gestor de flota",
  logistica: "Logística",
  chofer: "Chofer",
  usuario: "Usuario",
};

const roleImpact: Record<UserRole, string> = {
  superadmin: "tendrá acceso a las operaciones de la flota de la empresa.",
  gerente: "podrá administrar el equipo, los vehículos, los conductores y las rutas.",
  manager: "podrá gestionar vehículos, conductores y rutas, pero no administrar el equipo.",
  logistica: "podrá consultar el mapa y gestionar rutas, sin administrar vehículos ni conductores.",
  chofer: "podrá consultar y operar las rutas que tenga asignadas.",
  usuario: "no tendrá permisos para operar la flota.",
};

export function TeamManagement({ onBack }: TeamManagementProps = {}) {
  const {
    user,
    getTeamUsersPage,
    updateUserRole,
    updateUserStatus,
    updateUserProfile,
    createUser,
  } = useAuth();
  const {
    drivers,
    vehicles,
    loadErrors,
    vehiclesLoading,
    retryFleetData,
    refreshDrivers,
    getDriversPage,
    addDriver,
    updateDriver,
    setDriverActive,
    assignVehicleToDriver,
    unassignVehicleFromDriver,
    unlinkUserFromDriver,
  } = useFleet();

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; username: string; firstName: string; lastName: string } | null>(null);
  const [memberConfirmation, setMemberConfirmation] = useState<MemberConfirmation | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [teamLoadError, setTeamLoadError] = useState(false);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [driversLoadError, setDriversLoadError] = useState(false);
  const [showDriversSection, setShowDriversSection] = useState(false);
  const [showInactiveDrivers, setShowInactiveDrivers] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState("");
  const [teamActiveFilter, setTeamActiveFilter] = useState("");
  const [teamPage, setTeamPage] = useState(1);
  const [driverPage, setDriverPage] = useState(1);
  const [debouncedTeamSearch, setDebouncedTeamSearch] = useState("");
  const [debouncedDriverSearch, setDebouncedDriverSearch] = useState("");
  const [teamPageData, setTeamPageData] = useState<Awaited<ReturnType<typeof getTeamUsersPage>> | null>(null);
  const [driverPageData, setDriverPageData] = useState<Awaited<ReturnType<typeof getDriversPage>> | null>(null);
  const teamRequestSequence = useRef(0);
  const driverRequestSequence = useRef(0);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverEditForm, setDriverEditForm] = useState({
    firstName: "",
    lastName: "",
    documentNumber: "",
    phoneNumber: "",
  });

  const users = teamPageData?.items ?? [];
  const assignableRoles: UserRole[] = ["gerente", "manager", "logistica", "chofer", "usuario"]
    .filter((role): role is UserRole => role !== "gerente" || user?.isRootAccount === true);
  const hasDriverLoadError = driversLoadError || loadErrors.includes("conductores");
  const hasVehicleLoadError = loadErrors.includes("vehículos") || loadErrors.includes("opciones de asignación");
  const visibleDrivers = driverPageData?.items ?? [];
  const visibleUsers = teamPageData?.items ?? [];

  const loadTeamUsers = useCallback(async (page = teamPage) => {
    const requestSequence = ++teamRequestSequence.current;
    setIsLoadingTeam(true);
    setTeamLoadError(false);
    try {
      const result = await getTeamUsersPage({
        page,
        pageSize: 25,
        search: debouncedTeamSearch,
        role: teamRoleFilter ? ({ gerente: "Admin", manager: "Manager", logistica: "Logistics", chofer: "Driver", usuario: "User" } as Record<string, string>)[teamRoleFilter] ?? "" : "",
        isActive: teamActiveFilter,
      });
      if (requestSequence !== teamRequestSequence.current) return;
      if (page > Math.max(result.totalPages, 1)) {
        setTeamPage(Math.max(result.totalPages, 1));
        return;
      }
      setTeamPageData(result);
    } catch (error) {
      if (requestSequence !== teamRequestSequence.current) return;
      console.error("No se pudo cargar el equipo:", error);
      setTeamLoadError(true);
    } finally {
      if (requestSequence === teamRequestSequence.current) setIsLoadingTeam(false);
    }
  }, [debouncedTeamSearch, getTeamUsersPage, teamActiveFilter, teamPage, teamRoleFilter]);

  const loadDrivers = useCallback(async (onlyActive = !showInactiveDrivers, page = driverPage) => {
    const requestSequence = ++driverRequestSequence.current;
    setIsLoadingDrivers(true);
    setDriversLoadError(false);
    try {
      const result = await getDriversPage({ page, pageSize: 25, search: debouncedDriverSearch, onlyActive: onlyActive ? "true" : "" });
      if (requestSequence !== driverRequestSequence.current) return;
      if (page > Math.max(result.totalPages, 1)) {
        setDriverPage(Math.max(result.totalPages, 1));
        return;
      }
      setDriverPageData(result);
    } catch (error) {
      if (requestSequence !== driverRequestSequence.current) return;
      console.error("No se pudieron cargar los choferes:", error);
      setDriversLoadError(true);
    } finally {
      if (requestSequence === driverRequestSequence.current) setIsLoadingDrivers(false);
    }
  }, [debouncedDriverSearch, driverPage, getDriversPage, showInactiveDrivers]);

  const retryDrivers = async () => {
    await Promise.allSettled([
      loadDrivers(!showInactiveDrivers),
      refreshDrivers(),
    ]);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTeamSearch(teamSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [teamSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDriverSearch(driverSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [driverSearch]);

  useEffect(() => { setTeamPage(1); }, [debouncedTeamSearch, teamRoleFilter, teamActiveFilter]);
  useEffect(() => { setDriverPage(1); }, [debouncedDriverSearch, showInactiveDrivers]);
  useEffect(() => { void loadTeamUsers(teamPage); }, [loadTeamUsers, teamPage]);
  useEffect(() => { void loadDrivers(!showInactiveDrivers, driverPage); }, [driverPage, loadDrivers, showInactiveDrivers]);

  const [createUserForm, setCreateUserForm] = useState({
    nombres: "",
    apellidos: "",
    usuario: "",
    email: "",
    role: "chofer" as UserRole,
    documentNumber: "",
    phoneNumber: "",
  });

  const [createDriverForm, setCreateDriverForm] = useState({
    userId: "",
    firstName: "",
    lastName: "",
    documentNumber: "",
    phoneNumber: "",
  });

  const [assignSelection, setAssignSelection] = useState<Record<string, string>>({});

  const openCreateUserDialog = () => {
    setShowCreateUser(true);
  };

  const closeCreateUserDialog = () => {
    setShowCreateUser(false);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
      const previousRole = users.find((member) => member.id === userId)?.role;
    const result = await updateUserRole(userId, newRole);
    if (result?.ok) {
      toast.success("Rol actualizado exitosamente");
      await loadTeamUsers();
      if (previousRole === "chofer" || newRole === "chofer") await loadDrivers(false);
    } else {
      toast.error(result?.message ?? "No se pudo actualizar el rol");
    }
  };

  const handleUserStatusChange = async (userId: string, isActive: boolean) => {
    const result = await updateUserStatus(userId, isActive);
    if (result.ok) {
      toast.success(`Usuario ${isActive ? "activado" : "desactivado"}`);
      await loadTeamUsers();
    }
    else toast.error(result.message ?? "No se pudo actualizar el usuario");
  };

  const confirmMemberChange = () => {
    const confirmation = memberConfirmation;
    if (!confirmation) return;
    setMemberConfirmation(null);
    if (confirmation.kind === "role") {
      void handleRoleChange(confirmation.userId, confirmation.nextRole);
    } else if (confirmation.kind === "driver-unlink") {
      void handleUnlinkDriverUser(confirmation.driverId);
    } else {
      void handleUserStatusChange(confirmation.userId, confirmation.nextActive);
    }
  };

  const handleSaveUserProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;
    setIsSavingUser(true);
    const result = await updateUserProfile(editingUser.id, {
      username: editingUser.username,
      firstName: editingUser.firstName,
      lastName: editingUser.lastName,
    });
    setIsSavingUser(false);
    if (result.ok) {
      toast.success("Perfil del usuario actualizado");
      setEditingUser(null);
      const refreshResults = await Promise.allSettled([loadTeamUsers(), loadDrivers(false)]);
      if (refreshResults.some((refresh) => refresh.status === "rejected")) {
        toast.warning("El perfil se guardó, pero no se pudo actualizar toda la información visible.");
      }
    } else {
      toast.error(result.message ?? "No se pudo actualizar el perfil");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const userFields = {
      username: createUserForm.usuario.trim(),
      email: createUserForm.email.trim(),
      firstName: createUserForm.nombres.trim(),
      lastName: createUserForm.apellidos.trim(),
    };
    if (!userFields.username || !userFields.email || !userFields.firstName || !userFields.lastName) {
      toast.error("Por favor completa nombres, apellidos, usuario y correo");
      return;
    }
    if (userFields.username.length > 100 || userFields.firstName.length > 100 || userFields.lastName.length > 100 || userFields.email.length > 200) {
      toast.error("Usuario, nombres y apellidos admiten hasta 100 caracteres; el correo, hasta 200.");
      return;
    }

    if (createUserForm.role === "chofer" && (!createUserForm.documentNumber || !createUserForm.phoneNumber)) {
      toast.error("Para chofer indica documento y teléfono");
      return;
    }

    setIsCreating(true);

    const success = await createUser({
      nombres: userFields.firstName,
      apellidos: userFields.lastName,
      identificacion: createUserForm.documentNumber,
      usuario: userFields.username,
      email: userFields.email,
      role: createUserForm.role,
      teamId: undefined,
      password: "",
      phoneNumber: createUserForm.phoneNumber,
    });

    setIsCreating(false);

    if (success.ok) {
      closeCreateUserDialog();
      setCreateUserForm({
        nombres: "",
        apellidos: "",
        usuario: "",
        email: "",
        role: "chofer",
        documentNumber: "",
        phoneNumber: "",
      });

      setTeamPage(1);
      const refreshResults = await Promise.allSettled([
        loadTeamUsers(1),
        ...(createUserForm.role === "chofer" ? [loadDrivers(false)] : []),
      ]);
      if (success.invitationSent) {
        toast.success("Usuario creado y correo de invitación enviado");
      } else {
        toast.warning("Usuario creado, pero el correo de invitación no se pudo enviar");
      }
      if (refreshResults.some((result) => result.status === "rejected")) {
        toast.warning("La cuenta se creó, pero no se pudo actualizar toda la lista. Intenta recargarla.");
      }
    } else {
      toast.error(success.message ?? "No se pudo crear el usuario. Revisa los datos e inténtalo de nuevo.");
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const styles = {
      superadmin: "bg-red-100 text-red-700",
      gerente: "bg-purple-100 text-purple-700",
      manager: "bg-cyan-100 text-cyan-800",
      logistica: "bg-blue-100 text-blue-700",
      chofer: "bg-green-100 text-green-700",
      usuario: "bg-gray-100 text-gray-700",
    };
    const labels = {
      superadmin: "Super Admin",
      gerente: "Gerente",
      manager: "Gestor de flota",
      logistica: "Logística",
      chofer: "Chofer",
      usuario: "Usuario",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const permissionLabels: Record<keyof UserPermissions, string> = {
    canViewMap: "Ver Mapa en Tiempo Real",
    canCreateRoutes: "Crear y Gestionar Rutas",
    canManageVehicles: "Gestionar Vehículos",
    canManageDrivers: "Gestionar Conductores",
    canManageTeam: "Gestionar Equipo",
    canViewOwnRoute: "Ver Su Propia Ruta",
    canAccessSuperAdmin: "Administración de la empresa",
    canManageAllOrganizations: "Gestionar Todas las Organizaciones",
    canViewSystemLogs: "Ver Logs del Sistema",
    canExportData: "Exportar Datos del Sistema",
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userId, firstName, lastName, documentNumber, phoneNumber } = createDriverForm;
    if (!firstName.trim() || !lastName.trim() || !documentNumber.trim() || !phoneNumber.trim()) {
      toast.error("Completa todos los campos del chofer");
      return;
    }
    const result = await addDriver({ userId: userId || null, firstName, lastName, documentNumber, phoneNumber });
    if (result.ok) {
      toast.success(result.message ?? "Chofer creado");
      await loadDrivers(!showInactiveDrivers);
      setCreateDriverForm({ userId: "", firstName: "", lastName: "", documentNumber: "", phoneNumber: "" });
    } else {
      toast.error(result.message ?? "No se pudo crear el chofer");
    }
  };

  const handleAssignVehicle = async (driverId: string) => {
    const vehicleId = assignSelection[driverId];
    if (!vehicleId) {
      toast.error("Selecciona un vehículo");
      return;
    }
    const result = await assignVehicleToDriver(driverId, vehicleId);
    if (result.ok) {
      toast.success(result.message ?? "Vehículo asignado");
      const refreshed = await Promise.allSettled([
        loadDrivers(!showInactiveDrivers),
        refreshDrivers(),
      ]);
      if (refreshed.some((request) => request.status === "rejected")) {
        toast.warning("La asignación se guardó, pero no se pudo sincronizar la disponibilidad de vehículos.");
      }
    } else {
      toast.error(result.message ?? "No se pudo asignar el vehículo");
    }
  };

  const handleUnassignVehicle = async (driverId: string) => {
    const result = await unassignVehicleFromDriver(driverId);
    if (result.ok) {
      toast.success(result.message ?? "Vehículo desasignado");
      const refreshed = await Promise.allSettled([
        loadDrivers(!showInactiveDrivers),
        refreshDrivers(),
      ]);
      if (refreshed.some((request) => request.status === "rejected")) {
        toast.warning("La desasignación se guardó, pero no se pudo sincronizar la disponibilidad de vehículos.");
      }
    } else {
      toast.error(result.message ?? "No se pudo desasignar el vehículo");
    }
  };

  const handleUnlinkDriverUser = async (driverId: string) => {
    const result = await unlinkUserFromDriver(driverId);
    if (result.ok) {
      toast.success(result.message ?? "Cuenta desvinculada del conductor");
      try {
        await Promise.all([loadTeamUsers(), loadDrivers(!showInactiveDrivers)]);
      } catch {
        toast.warning("La cuenta se desvinculó, pero no se pudo actualizar la lista. Recarga para sincronizarla.");
      }
    } else {
      toast.error(result.message ?? "No se pudo desvincular la cuenta");
    }
  };

  const handleEditDriver = (driver: (typeof drivers)[number]) => {
    setEditingDriverId(driver.id);
    setDriverEditForm({
      firstName: driver.firstName,
      lastName: driver.lastName,
      documentNumber: driver.documentNumber,
      phoneNumber: driver.phoneNumber,
    });
  };

  const handleSaveDriver = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingDriverId) return;
    const payload = {
      firstName: driverEditForm.firstName.trim(),
      lastName: driverEditForm.lastName.trim(),
      documentNumber: driverEditForm.documentNumber.trim(),
      phoneNumber: driverEditForm.phoneNumber.trim(),
    };
    if (Object.values(payload).some((value) => !value)) {
      toast.error("Completa todos los datos del conductor.");
      return;
    }
    if (payload.documentNumber.length > 20 || payload.phoneNumber.length > 20) {
      toast.error("Documento y teléfono no pueden exceder 20 caracteres.");
      return;
    }
    const result = await updateDriver(editingDriverId, payload);
    if (result.ok) {
      toast.success(result.message ?? "Conductor actualizado");
      setEditingDriverId(null);
      await loadDrivers(!showInactiveDrivers);
    } else {
      toast.error(result.message ?? "No se pudo actualizar el conductor");
    }
  };

  const handleDriverStatus = async (driverId: string, isActive: boolean) => {
    const result = await setDriverActive(driverId, isActive);
    if (result.ok) {
      toast.success(result.message ?? "Estado actualizado");
      await loadDrivers(!showInactiveDrivers);
    }
    else toast.error(result.message ?? "No se pudo cambiar el estado del conductor");
  };

  return (
    <>
      <div className="flex h-full min-w-0 flex-col bg-white">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Volver"
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
        <div className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={() => setShowDriversSection((prev) => !prev)}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              {showDriversSection ? "Ocultar choferes" : "Gestionar choferes"}
            </button>
          </div>

          {showDriversSection && (
            <div className="mb-6 min-w-0 bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg text-gray-900">Choferes</h3>
                  <p className="text-sm text-gray-500">Gestiona conductores y asigna vehículos</p>
                </div>
                <button
                  onClick={() => void loadDrivers(!showInactiveDrivers)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  Recargar
                </button>
              </div>

              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showInactiveDrivers;
                    setShowInactiveDrivers(next);
                    void loadDrivers(!next);
                  }}
                  className="text-sm text-[#3271a4] hover:underline"
                >
                  {showInactiveDrivers ? "Ocultar bajas" : "Mostrar bajas"}
                </button>
              </div>

              <label className="relative mb-4 block">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  aria-label="Buscar choferes"
                  value={driverSearch}
                  onChange={(event) => setDriverSearch(event.target.value)}
                  placeholder="Buscar por nombre, documento o teléfono"
                  className="w-full min-w-0 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
                />
              </label>

              <form onSubmit={handleCreateDriver} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <select
                  aria-label="Usuario vinculado al chofer"
                  value={createDriverForm.userId}
                  onChange={(e) =>
                    setCreateDriverForm({
                      ...createDriverForm,
                      userId: e.target.value,
                      firstName:
                        users.find((u) => u.id === e.target.value)?.nombres || createDriverForm.firstName,
                      lastName: users.find((u) => u.id === e.target.value)?.apellidos || createDriverForm.lastName,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Sin usuario vinculado</option>
                  {users.filter((u) => u.isActive !== false).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombres} {u.apellidos} (@{u.usuario})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={createDriverForm.firstName}
                  onChange={(e) => setCreateDriverForm({ ...createDriverForm, firstName: e.target.value })}
                  placeholder="Nombres"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={createDriverForm.lastName}
                  onChange={(e) => setCreateDriverForm({ ...createDriverForm, lastName: e.target.value })}
                  placeholder="Apellidos"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={createDriverForm.documentNumber}
                  onChange={(e) => setCreateDriverForm({ ...createDriverForm, documentNumber: e.target.value })}
                  placeholder="Documento"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={createDriverForm.phoneNumber}
                  onChange={(e) => setCreateDriverForm({ ...createDriverForm, phoneNumber: e.target.value })}
                  placeholder="Teléfono"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <div className="md:col-span-5 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#3271a4] text-white rounded-lg text-sm hover:bg-[#2a5f8c]"
                  >
                    Crear Chofer
                  </button>
                </div>
              </form>

              {hasVehicleLoadError && (
                <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <span>No se pudieron cargar los vehículos. No es posible verificar cuáles están disponibles para asignación.</span>
                  <button type="button" onClick={() => void retryFleetData()} disabled={vehiclesLoading} className="rounded-md bg-white px-3 py-1.5 font-semibold disabled:opacity-50">
                    {vehiclesLoading ? "Reintentando…" : "Reintentar"}
                  </button>
                </div>
              )}

              {hasDriverLoadError ? (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <span>No se pudieron cargar los choferes. Comprueba tu conexión e inténtalo de nuevo.</span>
                  <button type="button" onClick={() => void retryDrivers()} disabled={isLoadingDrivers} className="rounded-md bg-white px-3 py-1.5 font-semibold disabled:opacity-50">
                    {isLoadingDrivers ? "Reintentando…" : "Reintentar"}
                  </button>
                </div>
              ) : isLoadingDrivers ? (
                <p className="text-sm text-gray-500">Cargando choferes...</p>
              ) : visibleDrivers.length === 0 ? (
                <p className="text-sm text-gray-500">{driverPageData?.totalCount === 0 && !driverSearch ? "No hay choferes registrados" : "No hay choferes que coincidan con la búsqueda o los filtros"}</p>
              ) : (
                <div className="space-y-3">
                  {visibleDrivers.map((driver) => {
                    const vehicle = vehicles.find((v) => v.id === driver.vehicleId);
                    const user = users.find((u) => u.id === driver.userId);
                    const assignableVehicles = vehicles.filter((candidate) =>
                      candidate.id === driver.vehicleId ||
                      (candidate.estado === "disponible" && !drivers.some((other) =>
                        other.id !== driver.id && other.isActive !== false && other.vehicleId === candidate.id,
                      )),
                    );
                    return (
                      <div
                        key={driver.id}
                        data-testid={`team-driver-${driver.id}`}
                        className="min-w-0 p-3 border border-gray-200 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {driver.firstName} {driver.lastName}
                            {!driver.isActive && <span className="ml-2 text-xs font-normal text-red-600">Inactivo</span>}
                          </p>
                          <p className="text-xs text-gray-500">
                            Doc: {driver.documentNumber} · Tel: {driver.phoneNumber}
                          </p>
                          <p className="text-xs text-gray-400">
                            Usuario: {user ? `@${user.usuario}` : driver.userId ? "Cuenta vinculada" : "Sin usuario vinculado"}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditDriver(driver)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDriverStatus(driver.id, !driver.isActive)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"
                          >
                            {driver.isActive ? "Dar de baja" : "Reactivar"}
                          </button>
                          {driver.userId && (
                            <button
                              type="button"
                              onClick={() => setMemberConfirmation({
                                kind: "driver-unlink",
                                driverId: driver.id,
                                memberName: user ? `@${user.usuario}` : "la cuenta vinculada",
                              })}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50"
                            >
                              <UserRoundX aria-hidden="true" size={14} />
                              Desvincular cuenta
                            </button>
                          )}
                          {driver.isActive && <>
                          <select
                            value={assignSelection[driver.id] ?? ""}
                            onChange={(e) =>
                              setAssignSelection((prev) => ({ ...prev, [driver.id]: e.target.value }))
                            }
                            disabled={hasVehicleLoadError || vehiclesLoading}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Selecciona vehículo</option>
                            {assignableVehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.placa} - {v.marca} {v.modelo}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignVehicle(driver.id)}
                            disabled={hasVehicleLoadError || vehiclesLoading}
                            className="px-3 py-2 bg-[#3271a4] text-white rounded-lg text-xs hover:bg-[#2a5f8c]"
                          >
                            Asignar
                          </button>
                          {driver.vehicleId && <button
                            onClick={() => handleUnassignVehicle(driver.id)}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100"
                          >
                            Quitar
                          </button>}
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Truck size={14} />
                            <span>{vehicle ? `${vehicle.placa} (${vehicle.marca})` : "Sin vehículo"}</span>
                          </div>
                          </>}
                        </div>
                        {editingDriverId === driver.id && (
                          <form onSubmit={handleSaveDriver} className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:col-span-2">
                            <input aria-label="Nombres del conductor" required maxLength={100} value={driverEditForm.firstName} onChange={(event) => setDriverEditForm({ ...driverEditForm, firstName: event.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            <input aria-label="Apellidos del conductor" required maxLength={100} value={driverEditForm.lastName} onChange={(event) => setDriverEditForm({ ...driverEditForm, lastName: event.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            <input aria-label="Documento del conductor" required maxLength={20} value={driverEditForm.documentNumber} onChange={(event) => setDriverEditForm({ ...driverEditForm, documentNumber: event.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            <input aria-label="Teléfono del conductor" required maxLength={20} value={driverEditForm.phoneNumber} onChange={(event) => setDriverEditForm({ ...driverEditForm, phoneNumber: event.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            <div className="flex gap-2 sm:col-span-2 sm:justify-end">
                              <button type="button" onClick={() => setEditingDriverId(null)} className="px-3 py-2 border rounded-lg text-sm">Cancelar</button>
                              <button type="submit" className="px-3 py-2 bg-[#3271a4] text-white rounded-lg text-sm">Guardar cambios</button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!hasDriverLoadError && !isLoadingDrivers && driverPageData && (
                <ServerPagination page={driverPageData.page} totalPages={driverPageData.totalPages} pageSize={driverPageData.pageSize} totalCount={driverPageData.totalCount} onPageChange={setDriverPage} />
              )}
            </div>
          )}

          {teamLoadError ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <span>No se pudo cargar el equipo. Comprueba tu conexión e inténtalo de nuevo.</span>
              <button type="button" onClick={() => void loadTeamUsers()} disabled={isLoadingTeam} className="rounded-md bg-white px-3 py-1.5 font-semibold disabled:opacity-50">
                {isLoadingTeam ? "Reintentando…" : "Reintentar"}
              </button>
            </div>
          ) : isLoadingTeam ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              Cargando equipo...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="relative block">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  aria-label="Buscar miembros del equipo"
                  value={teamSearch}
                  onChange={(event) => setTeamSearch(event.target.value)}
                  placeholder="Buscar por nombre, usuario o correo"
                  className="w-full min-w-0 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
                />
              </label>
              <select aria-label="Filtrar equipo por rol" value={teamRoleFilter} onChange={(event) => setTeamRoleFilter(event.target.value)} className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Todos los roles</option>
                <option value="gerente">Gerente</option>
                <option value="manager">Gestor de flota</option>
                <option value="logistica">Logística</option>
                <option value="chofer">Chofer</option>
                <option value="usuario">Usuario</option>
              </select>
              <select aria-label="Filtrar equipo por estado" value={teamActiveFilter} onChange={(event) => setTeamActiveFilter(event.target.value)} className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Todos los estados</option><option value="true">Activos</option><option value="false">Inactivos</option>
              </select>
              </div>
              <p className="text-sm text-gray-500">{teamPageData?.totalCount ?? 0} miembros</p>
              {visibleUsers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  {teamPageData?.totalCount === 0 && !teamSearch && !teamRoleFilter && !teamActiveFilter
                    ? "No hay otros miembros en el equipo."
                    : teamRoleFilter || teamActiveFilter
                      ? "No hay miembros que coincidan con la búsqueda o los filtros."
                      : "No hay miembros que coincidan con la búsqueda."}
                </div>
              ) : visibleUsers.map((user) => (
                <div
                  key={user.id}
                  data-testid={`team-user-${user.id}`}
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
                        <p className="break-words text-xs text-gray-500">@{user.usuario}</p>
                        {user.identificacion && (
                          <p className="text-xs text-gray-400 mt-0.5">ID: {user.identificacion}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Editar usuario ${user.usuario}`}
                        onClick={() => setEditingUser({
                          id: user.id,
                          username: user.usuario,
                          firstName: user.nombres,
                          lastName: user.apellidos,
                        })}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberConfirmation({
                          kind: "status",
                          userId: user.id,
                          memberName: `${user.nombres} ${user.apellidos}`.trim() || user.usuario,
                          nextActive: !user.isActive,
                        })}
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
                      {assignableRoles.map((role) => (
                        <button
                          key={role}
                          type="button"
                          disabled={user.role === role}
                          onClick={() => setMemberConfirmation({
                            kind: "role",
                            userId: user.id,
                            memberName: `${user.nombres} ${user.apellidos}`.trim() || user.usuario,
                            currentRole: user.role,
                            nextRole: role,
                          })}
                          className={`px-3 py-2 rounded-lg border-2 transition-all text-xs ${
                            user.role === role
                              ? role === "superadmin"
                                ? "border-red-600 bg-red-600 text-white"
                                : "border-[#3271a4] bg-[#3271a4] text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {roleLabels[role]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Permissions Summary */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-2">Permisos Activos</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(user.permissions)
                      .filter(([, value]) => value)
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

                  <p className="text-xs text-gray-500">Los permisos se determinan por el rol y se aplican desde el servidor.</p>
                </div>
              ))}
              {teamPageData && <ServerPagination page={teamPageData.page} totalPages={teamPageData.totalPages} pageSize={teamPageData.pageSize} totalCount={teamPageData.totalCount} onPageChange={setTeamPage} />}
            </div>
          )}
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog
        open={showCreateUser}
        onOpenChange={(open) => {
          if (!open) closeCreateUserDialog();
        }}
      >
        <DialogContent className="sm:max-w-md max-w-[95%] max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nombres</label>
                <input
                  type="text"
                  maxLength={100}
                  value={createUserForm.nombres}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, nombres: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3271a4] focus:border-transparent text-sm"
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Apellidos</label>
                <input
                  type="text"
                  maxLength={100}
                  value={createUserForm.apellidos}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, apellidos: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3271a4] focus:border-transparent text-sm"
                  placeholder="Pérez"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                maxLength={100}
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
                maxLength={200}
                value={createUserForm.email}
                onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3271a4] focus:border-transparent text-sm"
                placeholder="jperez@empresa.com"
              />
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-sm px-3 py-2">
              Después de crear la cuenta, indicaremos aquí si se pudo enviar el correo de activación.
            </div>

            {createUserForm.role === "chofer" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Documento</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={createUserForm.documentNumber}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3271a4] focus:border-transparent text-sm"
                    placeholder="DNI / ID"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={createUserForm.phoneNumber}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3271a4] focus:border-transparent text-sm"
                    placeholder="999999999"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm text-gray-700">Rol</label>
                <span className="text-xs text-gray-500">Selecciona el rol para el nuevo usuario</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assignableRoles.map((role) => {
                  const active = createUserForm.role === role;
                  const roleLabel = roleLabels[role];
                  const roleInfo =
                    role === "superadmin"
                      ? "Control total del sistema"
                      : role === "gerente"
                      ? "Administra equipos y rutas"
                      : role === "manager"
                      ? "Administra vehículos, conductores y rutas sin gestionar usuarios"
                      : role === "logistica"
                      ? "Gestiona operaciones diarias"
                      : role === "chofer"
                      ? "Conduce y reporta"
                      : "Consulta su cuenta sin permisos operativos de flota";
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

      <Dialog open={editingUser !== null} onOpenChange={(open) => { if (!open && !isSavingUser) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-md max-w-[95%] max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar miembro del equipo</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleSaveUserProfile} className="mt-4 space-y-4">
              <label className="block text-sm text-gray-700">
                Nombres
                <input required maxLength={100} value={editingUser.firstName} onChange={(event) => setEditingUser({ ...editingUser, firstName: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm text-gray-700">
                Apellidos
                <input required maxLength={100} value={editingUser.lastName} onChange={(event) => setEditingUser({ ...editingUser, lastName: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm text-gray-700">
                Usuario
                <input required maxLength={100} value={editingUser.username} onChange={(event) => setEditingUser({ ...editingUser, username: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <p className="text-xs text-gray-500">El correo de acceso se mantiene sin cambios.</p>
              <div className="flex justify-end gap-2">
                <button type="button" disabled={isSavingUser} onClick={() => setEditingUser(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={isSavingUser} className="rounded-lg bg-[#3271a4] px-4 py-2 text-sm text-white disabled:opacity-50">{isSavingUser ? "Guardando…" : "Guardar cambios"}</button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={memberConfirmation !== null}
        onClose={() => setMemberConfirmation(null)}
        onConfirm={confirmMemberChange}
        title={memberConfirmation?.kind === "driver-unlink"
          ? "Desvincular cuenta de conductor"
          : memberConfirmation?.kind === "role"
            ? "Confirmar cambio de rol"
            : memberConfirmation?.nextActive
            ? "Confirmar activación"
            : "Confirmar desactivación"}
        description={memberConfirmation?.kind === "driver-unlink"
          ? `Se desvinculará ${memberConfirmation.memberName} del perfil de conductor. Se conservarán la cuenta y el perfil, el rol Chofer y el historial. La operación se rechazará si hay rutas pendientes o en progreso; sus sesiones actuales se cerrarán.`
          : memberConfirmation?.kind === "role"
            ? `${memberConfirmation.memberName} cambiará de ${roleLabels[memberConfirmation.currentRole]} a ${roleLabels[memberConfirmation.nextRole]}. Con este rol ${roleImpact[memberConfirmation.nextRole]}`
            : memberConfirmation?.nextActive
            ? `Se activará la cuenta de ${memberConfirmation?.memberName}. La persona podrá volver a iniciar sesión y usar FleetFlow según los permisos de su rol.`
            : `Se desactivará la cuenta de ${memberConfirmation?.memberName}. La persona perderá acceso a FleetFlow y sus sesiones activas dejarán de funcionar.`}
        confirmText={memberConfirmation?.kind === "driver-unlink"
          ? "Sí, desvincular"
          : memberConfirmation?.kind === "role"
            ? "Confirmar cambio"
            : memberConfirmation?.nextActive
            ? "Sí, activar cuenta"
            : "Sí, desactivar cuenta"}
        cancelText="Cancelar"
        variant={memberConfirmation?.kind === "driver-unlink" || memberConfirmation?.kind === "status" && !memberConfirmation.nextActive
          ? "destructive"
          : "default"}
      />
    </>
  );
}
