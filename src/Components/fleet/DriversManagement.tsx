import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, RefreshCw, Truck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useFleet, type Driver } from "../../Context/FleetContext";
import { ServerPagination } from "../ui/ServerPagination";

interface DriversManagementProps {
  onBack?: () => void;
}

type DriverForm = Pick<Driver, "firstName" | "lastName" | "documentNumber" | "phoneNumber">;

const emptyForm: DriverForm = { firstName: "", lastName: "", documentNumber: "", phoneNumber: "" };

const normalizeSearchText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

export function DriversManagement({ onBack }: DriversManagementProps = {}) {
  const {
    drivers,
    vehicles,
    loadErrors,
    retryFleetData,
    getDriversPage,
    addDriver,
    updateDriver,
    setDriverActive,
    assignVehicleToDriver,
    unassignVehicleFromDriver,
  } = useFleet();
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<Awaited<ReturnType<typeof getDriversPage>> | null>(null);
  const requestSequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryingFleetData, setRetryingFleetData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehicleSelections, setVehicleSelections] = useState<Record<string, string>>({});

  const loadDrivers = useCallback(async (includeInactive: boolean, requestedPage = page) => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setLoadError(false);
    try {
      const result = await getDriversPage({ page: requestedPage, pageSize: 25, search: debouncedSearch, onlyActive: includeInactive ? "" : "true" });
      if (sequence !== requestSequence.current) return;
      if (requestedPage > Math.max(result.totalPages, 1)) {
        setPage(Math.max(result.totalPages, 1));
        return;
      }
      setPageData(result);
    } catch {
      if (sequence !== requestSequence.current) return;
      setLoadError(true);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [debouncedSearch, getDriversPage, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { setPage(1); }, [debouncedSearch, showInactive]);
  useEffect(() => { void loadDrivers(showInactive, page); }, [debouncedSearch, showInactive, page, loadDrivers]);

  const filteredDrivers = pageData?.items ?? [];
  const normalizedQuery = normalizeSearchText(debouncedSearch);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      documentNumber: form.documentNumber.trim(),
      phoneNumber: form.phoneNumber.trim(),
    };
    if (Object.values(payload).some((value) => !value)) {
      toast.error("Completa todos los datos del conductor.");
      return;
    }

    setSaving(true);
    const result = editingId
      ? await updateDriver(editingId, payload)
      : await addDriver({ ...payload, userId: null });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar el conductor.");
      return;
    }

    toast.success(editingId ? "Conductor actualizado." : "Conductor creado.");
    setForm(emptyForm);
    setEditingId(null);
    await loadDrivers(showInactive);
  };

  const edit = (driver: Driver) => {
    setEditingId(driver.id);
    setForm({
      firstName: driver.firstName,
      lastName: driver.lastName,
      documentNumber: driver.documentNumber,
      phoneNumber: driver.phoneNumber,
    });
  };

  const changeStatus = async (driver: Driver) => {
    const nextActive = driver.isActive === false;
    const result = await setDriverActive(driver.id, nextActive);
    if (!result.ok) {
      toast.error(result.message ?? "No se pudo cambiar el estado del conductor.");
      return;
    }
    toast.success(nextActive ? "Conductor reactivado." : "Conductor dado de baja.");
    await loadDrivers(showInactive);
  };

  const assignVehicle = async (driverId: string) => {
    const vehicleId = vehicleSelections[driverId];
    if (!vehicleId) {
      toast.error("Selecciona un vehículo disponible.");
      return;
    }
    const result = await assignVehicleToDriver(driverId, vehicleId);
    if (!result.ok) {
      toast.error(result.message ?? "No se pudo asignar el vehículo.");
      return;
    }
    toast.success("Vehículo asignado.");
    await loadDrivers(showInactive);
  };

  const unassignVehicle = async (driverId: string) => {
    const result = await unassignVehicleFromDriver(driverId);
    if (!result.ok) {
      toast.error(result.message ?? "No se pudo desasignar el vehículo.");
      return;
    }
    toast.success("Vehículo desasignado.");
    await loadDrivers(showInactive);
  };

  return (
    <section className="flex h-full min-h-full min-w-0 flex-col bg-white">
      <header className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} aria-label="Volver" className="rounded-lg p-2 hover:bg-slate-100">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Gestión de Conductores</h1>
            <p className="mt-1 text-sm text-slate-500">Administra conductores y sus vehículos asignados.</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadDrivers(showInactive)} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 sm:self-auto">
          <RefreshCw size={15} /> Recargar
        </button>
      </header>

      <div className="min-w-0 flex-1 space-y-5 overflow-auto p-4 md:p-6">
        {loadErrors.includes("vehículos") && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span>No se pudieron cargar los vehículos. Las opciones de asignación pueden estar incompletas.</span>
            <button
              type="button"
              onClick={async () => {
                setRetryingFleetData(true);
                try {
                  await retryFleetData();
                } finally {
                  setRetryingFleetData(false);
                }
              }}
              disabled={retryingFleetData}
              aria-busy={retryingFleetData}
              className="rounded-md bg-white px-3 py-1.5 font-semibold disabled:cursor-wait disabled:opacity-60"
            >
              {retryingFleetData ? "Reintentando…" : "Reintentar"}
            </button>
          </div>
        )}
        <form onSubmit={submit} className="grid w-full min-w-0 grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <h2 className="text-base font-semibold text-slate-800 sm:col-span-2 xl:col-span-4">{editingId ? "Editar conductor" : "Registrar conductor"}</h2>
          <input aria-label="Nombres del conductor" required maxLength={100} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="Nombres" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input aria-label="Apellidos del conductor" required maxLength={100} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Apellidos" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input aria-label="Documento del conductor" required maxLength={20} value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} placeholder="Documento" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input aria-label="Teléfono del conductor" required maxLength={20} value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} placeholder="Teléfono" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <p className="text-xs text-slate-500 sm:col-span-2 xl:col-span-3">Para vincular una cuenta de acceso, un Admin puede gestionarla desde Gestión de Equipo.</p>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2 xl:col-span-1">
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancelar</button>}
            <button type="submit" disabled={saving} className="rounded-lg bg-[#3271a4] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a5f8c] disabled:opacity-50">{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear conductor"}</button>
          </div>
        </form>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-800">Conductores ({pageData?.totalCount ?? 0})</h2>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              aria-label="Buscar conductores por nombre, apellido, documento o teléfono"
              placeholder="Buscar conductores"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-72"
            />
            <button type="button" onClick={() => { const next = !showInactive; setShowInactive(next); void loadDrivers(next); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">{showInactive ? "Ocultar bajas" : "Mostrar bajas"}</button>
          </div>
        </div>

        {loadError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span>No se pudieron cargar los conductores. Comprueba la conexión e inténtalo de nuevo.</span>
            <button type="button" onClick={() => void loadDrivers(showInactive)} disabled={loading} className="rounded-md bg-white px-3 py-1.5 font-semibold">Reintentar</button>
          </div>
        ) : loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">Cargando conductores…</p>
        ) : filteredDrivers.length === 0 ? normalizedQuery || showInactive ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
            <UserRound className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">No hay conductores que coincidan con la búsqueda.</p>
            <button type="button" onClick={() => setSearchQuery("")} className="mt-2 rounded-lg px-3 py-2 text-sm font-medium text-[#3271a4] hover:bg-slate-50">Limpiar búsqueda</button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
            <UserRound className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">No hay conductores {showInactive ? "registrados" : "activos"}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {filteredDrivers.map((driver) => {
              const assignedVehicle = vehicles.find((vehicle) => vehicle.id === driver.vehicleId);
              const availableVehicles = vehicles.filter((vehicle) => {
                if (vehicle.id === driver.vehicleId) return true;
                const alreadyAssigned = drivers.some((other) => other.id !== driver.id && other.vehicleId === vehicle.id);
                return vehicle.estado === "disponible" && !alreadyAssigned;
              });
              return (
                <article key={driver.id} data-testid={`managed-driver-${driver.id}`} className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-slate-900">{driver.firstName} {driver.lastName}</h3>
                      <p className="break-words text-sm text-slate-500">Documento: {driver.documentNumber} · Teléfono: {driver.phoneNumber}</p>
                      <p className="text-xs text-slate-500">{driver.userId ? "Cuenta vinculada" : "Sin usuario vinculado"} · {driver.isActive === false ? "Inactivo" : "Activo"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => edit(driver)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50">Editar</button>
                      <button type="button" onClick={() => void changeStatus(driver)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50">{driver.isActive === false ? "Reactivar" : "Dar de baja"}</button>
                    </div>
                  </div>
                  {driver.isActive !== false && (
                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-600">
                        <Truck size={16} className="shrink-0" />
                        <span className="break-words">{assignedVehicle ? `${assignedVehicle.placa} · ${assignedVehicle.marca} ${assignedVehicle.modelo}` : "Sin vehículo asignado"}</span>
                      </div>
                      <select aria-label={`Vehículo para ${driver.firstName}`} value={vehicleSelections[driver.id] ?? ""} onChange={(event) => setVehicleSelections((current) => ({ ...current, [driver.id]: event.target.value }))} className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-64">
                        <option value="">Selecciona vehículo</option>
                        {availableVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.placa} · {vehicle.marca} {vehicle.modelo}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void assignVehicle(driver.id)} className="rounded-lg bg-[#3271a4] px-3 py-2 text-xs font-medium text-white">Asignar</button>
                        {driver.vehicleId && <button type="button" onClick={() => void unassignVehicle(driver.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">Quitar</button>}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {!loadError && !loading && pageData && <ServerPagination page={pageData.page} totalPages={pageData.totalPages} pageSize={pageData.pageSize} totalCount={pageData.totalCount} onPageChange={setPage} />}
      </div>
    </section>
  );
}
