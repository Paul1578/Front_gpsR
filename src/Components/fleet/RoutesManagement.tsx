/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useFleet, Route } from "../../Context/FleetContext";
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  Edit,
  MapPin,
  Plus,
  Route as RouteIcon,
  Search,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "sonner";
import type { PickerPoint } from "./RoutePickerMap";

const RoutePickerMap = dynamic(() => import("./RoutePickerMap"), {
  ssr: false,
});

interface RoutesManagementProps {
  onBack?: () => void;
}
type RouteStatus = Route["estado"];
type Target = { type: "origin" | "stop" | "destination"; index?: number };
type SearchResult = { lat: number; lon: number; display_name: string };

const validPoint = (point: PickerPoint | null) =>
  !!point &&
  Number.isFinite(point.lat) &&
  Number.isFinite(point.lng) &&
  point.lat >= -90 &&
  point.lat <= 90 &&
  point.lng >= -180 &&
  point.lng <= 180 &&
  !(Math.abs(point.lat) < 0.0001 && Math.abs(point.lng) < 0.0001);

export function RoutesManagement({ onBack }: RoutesManagementProps = {}) {
  const { routes, vehicles, routeAssignmentVehicles, routeAssignmentDrivers, addRoute, updateRoute, deleteRoute, loadErrors, routesLoading, retryFleetData } = useFleet();
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [cancelConfirmRoute, setCancelConfirmRoute] = useState<Route | null>(null);
  const [step, setStep] = useState(1);
  const [activeTarget, setActiveTarget] = useState<Target | null>(null);
  const activeTargetRef = useRef<Target | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchSequenceRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [routeSearch, setRouteSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RouteStatus | "all">("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    vehicleId: "",
    driverId: "",
    cargoDescription: "",
    origin: null as PickerPoint | null,
    stops: [] as PickerPoint[],
    destination: null as PickerPoint | null,
    status: "pendiente" as RouteStatus,
  });
  const drivers = routeAssignmentDrivers.map((driver) => ({
      driverKey: driver.id,
      nombres: driver.firstName,
      apellidos: driver.lastName,
      isAvailable: driver.isAvailable !== false,
    }));

  const availableVehicles = routeAssignmentVehicles.filter(
    (vehicle) =>
      vehicle.estado === "disponible" || vehicle.id === formData.vehicleId,
  );
  const visibleRoutes = routes.filter((route) => {
    const search = routeSearch.trim().toLocaleLowerCase();
    const matchesSearch = !search || route.nombre.toLocaleLowerCase().includes(search);
    return matchesSearch &&
      (statusFilter === "all" || route.estado === statusFilter) &&
      (vehicleFilter === "all" || route.vehiculoId === vehicleFilter) &&
      (driverFilter === "all" || route.conductorId === driverFilter);
  });
  const hasActiveRouteFilters = routeSearch.trim().length > 0 ||
    statusFilter !== "all" || vehicleFilter !== "all" || driverFilter !== "all";
  const assignmentOptionsUnavailable = loadErrors.includes("opciones de asignación");
  const clearRouteFilters = () => {
    setRouteSearch("");
    setStatusFilter("all");
    setVehicleFilter("all");
    setDriverFilter("all");
  };
  const vehicleName = (id: string) => {
    const vehicle = routeAssignmentVehicles.find((item) => item.id === id) ?? vehicles.find((item) => item.id === id);
    if (vehicle) return `${vehicle.placa} · ${vehicle.marca} ${vehicle.modelo}`;
    if (id && assignmentOptionsUnavailable) return "No disponible temporalmente";
    return id ? "Vehículo no disponible" : "Sin vehículo asignado";
  };
  const driverName = (id: string) => {
    const driver = routeAssignmentDrivers.find((item) => item.id === id);
    if (driver) return `${driver.firstName} ${driver.lastName}`.trim();
    if (id && assignmentOptionsUnavailable) return "No disponible temporalmente";
    return id ? "Conductor no disponible" : "Sin conductor asignado";
  };

  const cancelLocationSearch = () => {
    searchSequenceRef.current += 1;
    searchControllerRef.current?.abort();
    searchControllerRef.current = null;
    setSearching(false);
  };

  const sameTarget = (left: Target | null, right: Target | null) =>
    left?.type === right?.type && left?.index === right?.index;

  const setPoint = (target: Target, point: PickerPoint) => {
    cancelLocationSearch();
    activeTargetRef.current = null;
    setFormData((previous) => {
      const normalized = {
        ...point,
        nombre:
          point.nombre ||
          (target.type === "origin"
            ? "Origen"
            : target.type === "destination"
              ? "Destino"
              : `Parada ${(target.index ?? previous.stops.length) + 1}`),
      };
      if (target.type === "origin") return { ...previous, origin: normalized };
      if (target.type === "destination")
        return { ...previous, destination: normalized };
      const stops = [...previous.stops];
      stops[target.index ?? stops.length] = normalized;
      return { ...previous, stops };
    });
    setActiveTarget(null);
    setSearchResults([]);
    setSearchQuery("");
  };

  const selectTarget = (target: Target) => {
    cancelLocationSearch();
    activeTargetRef.current = target;
    setActiveTarget(target);
    setSearchResults([]);
    setSearchQuery("");
  };
  const searchLocations = async () => {
    const targetAtStart = activeTargetRef.current;
    if (!targetAtStart) return;
    const query = searchQuery.trim();
    if (query.length < 3) {
      toast.error("Escribe al menos 3 caracteres para buscar");
      return;
    }
    searchControllerRef.current?.abort();
    const controller = new AbortController();
    const sequence = ++searchSequenceRef.current;
    searchControllerRef.current = controller;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=es&q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error("No se pudo buscar la ubicación");
      const results = (await response.json()) as SearchResult[];
      if (
        sequence !== searchSequenceRef.current ||
        !sameTarget(targetAtStart, activeTargetRef.current)
      ) return;
      setSearchResults(results);
      if (!results.length)
        toast.info(
          "No encontramos esa ubicación. Prueba con una dirección más específica.",
        );
    } catch {
      if (controller.signal.aborted || sequence !== searchSequenceRef.current) return;
      toast.error(
        "No se pudo buscar la ubicación. También puedes hacer clic directamente en el mapa.",
      );
    } finally {
      if (sequence === searchSequenceRef.current) {
        searchControllerRef.current = null;
        setSearching(false);
      }
    }
  };

  const resetForm = () => {
    cancelLocationSearch();
    setShowForm(false);
    setEditingRoute(null);
    setStep(1);
    activeTargetRef.current = null;
    setActiveTarget(null);
    setSearchResults([]);
    setSearchQuery("");
    setFormData({
      name: "",
      vehicleId: "",
      driverId: "",
      cargoDescription: "",
      origin: null,
      stops: [],
      destination: null,
      status: "pendiente",
    });
  };
  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };
  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.nombre,
      vehicleId: route.vehiculoId,
      driverId: route.conductorId,
      cargoDescription: route.carga,
      origin: route.origen ?? null,
      stops: route.puntos ?? [],
      destination: route.destino ?? null,
      status: route.estado ?? "pendiente",
    });
    setStep(1);
    setShowForm(true);
  };

  const validateStep = (nextStep: number) => {
    if (
      nextStep >= 2 &&
      (!formData.name.trim() || !formData.cargoDescription.trim())
    ) {
      toast.error("Completa el nombre y la descripción de la carga");
      setStep(1);
      return false;
    }
    if (
      nextStep >= 3 &&
      (!validPoint(formData.origin) || !validPoint(formData.destination))
    ) {
      toast.error("Define un origen y un destino para continuar");
      setStep(2);
      return false;
    }
    if (nextStep >= 4 && (!formData.vehicleId || !formData.driverId)) {
      toast.error("Asigna un vehículo y un conductor");
      setStep(3);
      return false;
    }
    return true;
  };
  const goToStep = (nextStep: number) => {
    if (nextStep > step && !validateStep(nextStep)) return;
    if (nextStep === 2 && !editingRoute && !formData.origin && !activeTarget) {
      const originTarget = { type: "origin" } as const;
      activeTargetRef.current = originTarget;
      setActiveTarget(originTarget);
    }
    setStep(nextStep);
  };

  const handleSubmit = async () => {
    if (savingRef.current) return;
    if (!validateStep(4) || !formData.origin || !formData.destination) return;
    const allPoints = [
      formData.origin,
      ...formData.stops,
      formData.destination,
    ];
    if (allPoints.some((point) => !validPoint(point))) {
      toast.error("Hay una ubicación inválida en el recorrido");
      setStep(2);
      return;
    }
    const payload: Omit<Route, "id" | "fechaCreacion"> = {
      nombre: formData.name.trim(),
      vehiculoId: formData.vehicleId,
      conductorId: formData.driverId,
      carga: formData.cargoDescription.trim(),
      origen: formData.origin,
      destino: formData.destination,
      puntos: formData.stops,
      estado: formData.status,
      teamId: undefined,
    };
    savingRef.current = true;
    setSaving(true);
    try {
      const result = editingRoute
        ? await updateRoute(editingRoute.id, payload)
        : await addRoute(payload);
      if (result.ok) {
        toast.success(result.message ?? (editingRoute ? "Ruta actualizada" : "Ruta creada"));
        resetForm();
      } else toast.error(result.message ?? "No se pudo guardar la ruta");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const removeStop = (index: number) =>
    setFormData((previous) => ({
      ...previous,
      stops: previous.stops.filter((_, itemIndex) => itemIndex !== index),
    }));
  const moveStop = (index: number, direction: -1 | 1) =>
    setFormData((previous) => {
      const stops = [...previous.stops];
      const target = index + direction;
      if (target < 0 || target >= stops.length) return previous;
      [stops[index], stops[target]] = [stops[target], stops[index]];
      return { ...previous, stops };
    });
  const formatDate = (date?: string | null) => date
    ? new Date(date).toLocaleDateString("es-EC", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : "No registrada";

  if (showForm) {
    return (
      <RouteBuilder
        formData={formData}
        setFormData={setFormData}
        step={step}
        goToStep={goToStep}
        activeTarget={activeTarget}
        selectTarget={selectTarget}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        searching={searching}
        searchLocations={searchLocations}
        setPoint={setPoint}
        removeStop={removeStop}
        moveStop={moveStop}
        availableVehicles={availableVehicles}
        drivers={drivers}
        loadErrors={loadErrors}
        retryFleetData={retryFleetData}
        vehicleName={vehicleName}
        driverName={driverName}
        editingRoute={editingRoute}
        onCancel={resetForm}
        onSubmit={handleSubmit}
        saving={saving}
      />
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="rounded-lg p-2 hover:bg-slate-100"
                  aria-label="Volver"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div>
                <p className="text-sm font-medium text-blue-700">Operación</p>
                <h1 className="text-2xl font-semibold text-slate-900">Rutas</h1>
                <p className="text-sm text-slate-500">
                  Planifica, asigna y controla tus recorridos de entrega.
                </p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#3271a4] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2a5f8c]"
            >
              <Plus size={17} />
              Nueva ruta
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5 md:p-8">
          {loadErrors.includes("rutas") && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>No se pudieron cargar las rutas. Los datos mostrados pueden estar incompletos.</span><button onClick={() => void retryFleetData()} className="rounded-md bg-white px-3 py-1.5 font-semibold">Reintentar</button></div>}
          {assignmentOptionsUnavailable && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>No se pudieron cargar todas las opciones de asignación. Algunos nombres pueden aparecer temporalmente incompletos.</span><button onClick={() => void retryFleetData()} className="rounded-md bg-white px-3 py-1.5 font-semibold">Reintentar</button></div>}
          <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-medium text-slate-600">Buscar ruta
              <input value={routeSearch} onChange={(event) => setRouteSearch(event.target.value)} placeholder="Nombre de ruta" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">Estado
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as RouteStatus | "all")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="all">Todos</option><option value="pendiente">Pendiente</option><option value="en_progreso">En progreso</option><option value="completada">Completada</option><option value="cancelada">Cancelada</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">Vehículo
              <select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="all">Todos</option>{routeAssignmentVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.placa}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">Conductor
              <select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="all">Todos</option>{drivers.map((driver) => <option key={driver.driverKey} value={driver.driverKey}>{driver.nombres} {driver.apellidos}</option>)}
              </select>
            </label>
            {hasActiveRouteFilters && <div className="flex justify-end sm:col-span-2 xl:col-span-4">
              <button type="button" onClick={clearRouteFilters} className="rounded-md px-2 py-1 text-sm font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Limpiar filtros</button>
            </div>}
          </div>
          {routesLoading ? (
            <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Cargando rutas…
            </p>
          ) : loadErrors.includes("rutas") && routes.length === 0 ? null : routes.length === 0 ? (
            <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <RouteIcon size={42} className="mb-4 text-slate-300" />
              <h2 className="font-semibold text-slate-800">
                Aún no tienes rutas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Crea tu primera ruta para empezar a organizar las entregas.
              </p>
              <button
                onClick={openCreate}
                className="mt-5 rounded-lg bg-[#3271a4] px-4 py-2 text-sm font-semibold text-white"
              >
                Crear primera ruta
              </button>
            </div>
          ) : (
            visibleRoutes.length === 0 ? <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Ninguna ruta coincide con esos filtros.</div> : <div className="grid gap-4 xl:grid-cols-2">
              {visibleRoutes.map((route) => (
                <div
                  key={route.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-lg bg-blue-50 p-2.5">
                        <RouteIcon size={19} className="text-blue-700" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-slate-900">
                          {route.nombre}
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Creada el {formatDate(route.createdAtUtc)}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {route.estado === "en_progreso"
                        ? "En progreso"
                        : route.estado === "completada"
                          ? "Completada"
                          : route.estado === "cancelada"
                            ? "Cancelada"
                            : "Pendiente"}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Asignación</p>
                      <p className="mt-1 text-slate-800">
                        {vehicleName(route.vehiculoId)}
                      </p>
                      <p className="text-slate-600">
                        {driverName(route.conductorId)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Recorrido</p>
                      <p className="mt-1 text-slate-800">
                        {(route.puntos?.length ?? 0) + 2} puntos · {route.carga}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => handleEdit(route)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                    >
                      <Edit size={15} />
                      Editar ruta
                    </button>
                    {route.estado === "pendiente" && (
                      <button
                        onClick={() => setCancelConfirmRoute(route)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                        aria-label={`Cancelar ruta ${route.nombre}`}
                      >
                        <Ban size={15} />
                        <span className="hidden sm:inline">Cancelar</span>
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(route.id)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
                      aria-label={`Eliminar ${route.nombre}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={!!cancelConfirmRoute}
        onClose={() => setCancelConfirmRoute(null)}
        onConfirm={async () => {
          if (!cancelConfirmRoute) return;
          const result = await updateRoute(cancelConfirmRoute.id, { estado: "cancelada" });
          if (result.ok) {
            setCancelConfirmRoute(null);
            toast.success(result.message ?? "Ruta cancelada");
          } else {
            toast.error(result.message ?? "No se pudo cancelar la ruta");
          }
        }}
        title="Cancelar ruta pendiente"
        description={`¿Confirmas la cancelación de “${cancelConfirmRoute?.nombre ?? "esta ruta"}”? La disponibilidad del vehículo depende de su estado operativo y de otras rutas activas.`}
        confirmText="Sí, cancelar ruta"
        cancelText="Seguir con la ruta"
        variant="destructive"
      />
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          const result = await deleteRoute(deleteConfirm);
          if (result.ok) setDeleteConfirm(null);
          else toast.error(result.message ?? "No se pudo eliminar la ruta");
        }}
        title="Eliminar ruta"
        description="¿Estás seguro de que deseas eliminar esta ruta? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}

type RouteBuilderProps = { searchResults: SearchResult[]; saving: boolean; [key: string]: any };

function RouteBuilder({
  formData,
  setFormData,
  step,
  goToStep,
  activeTarget,
  selectTarget,
  searchQuery,
  setSearchQuery,
  searchResults,
  searching,
  searchLocations,
  setPoint,
  removeStop,
  moveStop,
  availableVehicles,
  drivers,
  loadErrors,
  retryFleetData,
  vehicleName,
  driverName,
  editingRoute,
  onCancel,
  onSubmit,
  saving,
}: RouteBuilderProps) {
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const activateTarget = (target: Target) => {
    selectTarget(target);
    setMobileMapOpen(true);
  };
  const setPointAndReturnToEditor = (target: Target, point: PickerPoint) => {
    setPoint(target, point);
    setMobileMapOpen(false);
  };
  const targetLabel =
    activeTarget?.type === "origin"
      ? "origen"
      : activeTarget?.type === "destination"
        ? "destino"
        : activeTarget
          ? `parada ${activeTarget.index + 1}`
          : "punto";
  const pointSummary = (point: PickerPoint | null, fallback: string) =>
    point?.nombre || fallback;
  const reviewPoints = [
    { label: "Origen", point: formData.origin, operation: null as string | null },
    ...formData.stops.map((point: PickerPoint, index: number) => ({
      label: `Parada ${index + 1}`,
      point,
      operation: point.operation ?? "delivery",
    })),
    { label: "Destino", point: formData.destination, operation: null as string | null },
  ];
  const operationLabel: Record<string, string> = {
    pickup: "Recogida",
    delivery: "Entrega",
    pickup_and_delivery: "Recogida y entrega",
  };
  const pointRow = (
    type: "origin" | "stop" | "destination",
    point: PickerPoint | null,
    index?: number,
  ) => {
    const target = {
      type,
      ...(index !== undefined ? { index } : {}),
    } as Target;
    const selected =
      activeTarget?.type === type && activeTarget?.index === index;
    const operation =
      point?.operation ?? (type === "stop" ? "delivery" : "none");
    const updateOperation = (value: PickerPoint["operation"]) => {
      setFormData((previous: any) => {
        if (type === "origin")
          return {
            ...previous,
            origin: previous.origin
              ? { ...previous.origin, operation: value }
              : previous.origin,
          };
        if (type === "destination")
          return {
            ...previous,
            destination: previous.destination
              ? { ...previous.destination, operation: value }
              : previous.destination,
          };
        return {
          ...previous,
          stops: previous.stops.map((stop: PickerPoint, stopIndex: number) =>
            stopIndex === index ? { ...stop, operation: value } : stop,
          ),
        };
      });
    };
    return (
      <div
        data-testid={`${type}-point-${index ?? 0}`}
        className={`rounded-xl border p-3 ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${type === "origin" ? "bg-green-100 text-green-700" : type === "destination" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"}`}
          >
            {type === "origin"
              ? "A"
              : type === "destination"
                ? "B"
                : (index ?? 0) + 1}
          </div>
          <div className="min-w-[130px] flex-1">
            <input
              value={point?.nombre ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                if (type === "origin")
                  setFormData((p: any) => ({
                    ...p,
                    origin: p.origin
                      ? { ...p.origin, nombre: value }
                      : { lat: Number.NaN, lng: Number.NaN, nombre: value },
                  }));
                else if (type === "destination")
                  setFormData((p: any) => ({
                    ...p,
                    destination: p.destination
                      ? { ...p.destination, nombre: value }
                      : { lat: Number.NaN, lng: Number.NaN, nombre: value },
                  }));
                else
                  setFormData((p: any) => ({
                    ...p,
                    stops: p.stops.map((s: PickerPoint, i: number) =>
                      i === index ? { ...s, nombre: value } : s,
                    ),
                  }));
              }}
              placeholder={
                type === "origin"
                  ? "¿Desde dónde sale?"
                  : type === "destination"
                    ? "¿A dónde llega?"
                    : `Parada ${index! + 1}`
              }
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
            <p
              className={`mt-0.5 truncate text-xs ${validPoint(point) ? "font-medium text-emerald-700" : "text-slate-500"}`}
              aria-live="polite"
            >
              {point && validPoint(point)
                ? `Ubicación fijada · ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
                : "Ubicación pendiente"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => activateTarget(target)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${selected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <MapPin size={14} className="mr-1 inline" />
            {selected ? "Seleccionando" : "Ubicar"}
          </button>
          {type === "stop" && (
            <select
              aria-label={`Tipo de operación de la parada ${(index ?? 0) + 1}`}
              value={operation}
              onChange={(event) =>
                updateOperation(event.target.value as PickerPoint["operation"])
              }
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700"
            >
              <option value="delivery">Entrega</option>
              <option value="pickup">Recogida</option>
              <option value="pickup_and_delivery">Recogida y entrega</option>
            </select>
          )}
          {type === "stop" && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => moveStop(index!, -1)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Subir parada"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => moveStop(index!, 1)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Bajar parada"
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => removeStop(index!)}
                className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Eliminar parada"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg p-2 hover:bg-slate-100"
            aria-label={editingRoute ? "Cancelar edición" : "Cancelar creación"}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Constructor de rutas
            </p>
            <h1 className="text-xl font-semibold text-slate-900">
              {editingRoute ? "Editar ruta" : "Nueva ruta"}
            </h1>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {["Información", "Recorrido", "Asignación", "Revisión"].map(
            (label, index) => (
              <button
                key={label}
                onClick={() => goToStep(index + 1)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${step === index + 1 ? "bg-blue-100 text-blue-800" : step > index + 1 ? "text-green-700" : "text-slate-400"}`}
              >
                {step > index + 1 ? <Check size={14} /> : index + 1}
                {label}
              </button>
            ),
          )}
        </div>
        <button
          onClick={onCancel}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </header>
      <div className="flex-1 overflow-auto">
        {step === 2 && (
          <div className="sticky top-0 z-[600] flex gap-2 border-b border-slate-200 bg-white p-3 lg:hidden">
            {mobileMapOpen ? (
              <button
                type="button"
                onClick={() => setMobileMapOpen(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Ver paradas y detalles
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileMapOpen(true)}
                className="flex-1 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Ver mapa
              </button>
            )}
          </div>
        )}
        <div className="mx-auto grid min-h-full max-w-[1500px] lg:grid-cols-[minmax(360px,0.8fr)_minmax(500px,1.2fr)]">
          <section className={`${step === 2 && mobileMapOpen ? "hidden lg:block" : ""} overflow-y-auto p-5 md:p-8`}>
            {step === 1 && (
              <div className="mx-auto max-w-xl">
                <StepTitle
                  number="01"
                  title="Información de la ruta"
                  description="Define qué se va a entregar y cuándo."
                />
                <label className="mt-8 block text-sm font-semibold text-slate-700">
                  Nombre de la ruta <span className="text-red-500">*</span>
                  <input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p: any) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Ej. Entregas zona norte"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="mt-5 block text-sm font-semibold text-slate-700">
                  Descripción de la carga{" "}
                  <span className="text-red-500">*</span>
                  <textarea
                    value={formData.cargoDescription}
                    onChange={(e) =>
                      setFormData((p: any) => ({
                        ...p,
                        cargoDescription: e.target.value,
                      }))
                    }
                    placeholder="Productos, cantidad o instrucciones para el conductor"
                    rows={5}
                    className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            )}
            {step === 2 && (
              <div className="mx-auto max-w-xl">
                <StepTitle
                  number="02"
                  title="Construye el recorrido"
                  description="Busca una dirección o haz clic en el mapa para fijar cada punto."
                />
                <div className="mt-8 space-y-3">
                  {pointRow("origin", formData.origin)}
                  {formData.stops.map((stop: PickerPoint, index: number) => (
                    <div key={`${index}-${stop.lat}-${stop.lng}`}>
                      {pointRow("stop", stop, index)}
                    </div>
                  ))}
                  {pointRow("destination", formData.destination)}
                  <button
                    type="button"
                    onClick={() => {
                      const index = formData.stops.length;
                      setFormData((p: any) => ({
                        ...p,
                        stops: [
                          ...p.stops,
                          {
                              lat: Number.NaN,
                              lng: Number.NaN,
                              nombre: `Parada ${index + 1}`,
                              operation: "delivery",
                              status: "pending",
                          },
                        ],
                      }));
                      activateTarget({ type: "stop", index });
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
                  >
                    <Plus size={16} />
                    Agregar parada
                  </button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="mx-auto max-w-xl">
                <StepTitle
                  number="03"
                  title="Asigna los recursos"
                  description="Elige quién hará la ruta y con qué vehículo."
                />
                {loadErrors.includes("opciones de asignación") && (
                  <div role="alert" className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <span>No se pudieron cargar los vehículos y conductores para asignar. Reintenta antes de continuar.</span>
                    <button onClick={() => void retryFleetData()} className="rounded-md bg-white px-3 py-1.5 font-semibold">Reintentar</button>
                  </div>
                )}
                <ResourceSelect
                  icon={<Truck size={18} />}
                  label="Vehículo"
                  value={formData.vehicleId}
                  onChange={(value: string) =>
                    setFormData((p: any) => ({ ...p, vehicleId: value }))
                  }
                  options={availableVehicles.map((v: any) => ({
                    value: v.id,
                    label: `${v.placa} · ${v.marca} ${v.modelo}`,
                    detail:
                      v.estado === "disponible"
                        ? "Disponible"
                        : "Asignado a esta ruta",
                  }))}
                />
                <ResourceSelect
                  icon={<UserRound size={18} />}
                  label="Conductor"
                  value={formData.driverId}
                  onChange={(value: string) =>
                    setFormData((p: any) => ({ ...p, driverId: value }))
                  }
                  options={drivers.map((d: any) => ({
                    value: d.driverKey,
                    label: `${d.nombres} ${d.apellidos}`,
                    detail: d.isAvailable ? "Disponible" : "En una ruta en curso",
                    disabled: !d.isAvailable && d.driverKey !== formData.driverId,
                  }))}
                />
              </div>
            )}
            {step === 4 && (
              <div className="mx-auto max-w-xl">
                <StepTitle
                  number="04"
                  title="Revisa y crea"
                  description="Confirma los datos antes de asignar la ruta."
                />
                <div className="mt-8 space-y-4">
                  <ReviewRow label="Ruta" value={formData.name} />
                  <ReviewRow label="Carga" value={formData.cargoDescription} />
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Secuencia de paradas</h3>
                    <ol className="mt-3 space-y-2" aria-label="Orden de las paradas de la ruta">
                      {reviewPoints.map(({ label, point, operation }, index) => (
                        <li key={`${label}-${index}`} className="flex min-w-0 items-start gap-3 rounded-lg bg-slate-50 p-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
                              {operation && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700">{operationLabel[operation] ?? operation}</span>}
                            </div>
                            <p className="mt-1 break-words text-sm text-slate-900">{pointSummary(point, "Ubicación pendiente")}</p>
                            <p className={`mt-1 text-xs ${validPoint(point) ? "text-emerald-700" : "text-amber-700"}`}>
                              {validPoint(point) ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Falta fijar la ubicación"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <ReviewRow
                    label="Vehículo"
                    value={vehicleName(formData.vehicleId)}
                  />
                  <ReviewRow
                    label="Conductor"
                    value={driverName(formData.driverId)}
                  />
                </div>
              </div>
            )}
            <div className="mt-10 flex gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={() => (step === 1 ? onCancel() : goToStep(step - 1))}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                {step === 1 ? "Cancelar" : "Atrás"}
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => goToStep(step + 1)}
                  className="flex-1 rounded-lg bg-[#3271a4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a5f8c]"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#3271a4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a5f8c]"
                >
                  {saving ? "Guardando…" : editingRoute ? "Guardar cambios" : "Crear ruta"}
                </button>
              )}
            </div>
          </section>
          <section className={`${step === 2 && !mobileMapOpen ? "hidden lg:block" : ""} relative min-h-[460px] border-t border-slate-200 bg-slate-200 lg:min-h-0 lg:border-l lg:border-t-0`}>
            <div className="absolute left-4 right-4 top-4 z-[500] rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur md:left-8 md:right-8 md:top-8">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Search size={15} className="text-blue-700" />
                {activeTarget
                  ? `Ubicando ${targetLabel}`
                  : "Selecciona un punto para buscarlo"}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLocations()}
                  placeholder={
                    activeTarget
                      ? "Busca una dirección o lugar"
                      : "Primero elige Origen, Parada o Destino"
                  }
                  disabled={!activeTarget}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={searchLocations}
                  disabled={!activeTarget || searching}
                  className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {searching ? "Buscando…" : "Buscar"}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white">
                  {searchResults.map((result) => (
                    <button
                      type="button"
                      key={`${result.lat}-${result.lon}`}
                      onClick={() =>
                        activeTarget &&
                        setPointAndReturnToEditor(activeTarget, {
                          lat: Number(result.lat),
                          lng: Number(result.lon),
                          nombre: result.display_name,
                        })
                      }
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 last:border-0 hover:bg-blue-50"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="absolute bottom-4 left-4 z-[500] rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-600 shadow md:bottom-8 md:left-8">
              {activeTarget
                ? "Haz clic en el mapa para fijar la ubicación"
                : "Los puntos aparecerán aquí"}
            </div>
            <RoutePickerMap
              origin={formData.origin}
              stops={formData.stops.filter((p: PickerPoint) => validPoint(p))}
              destination={formData.destination}
              activeTarget={
                activeTarget?.type === "stop"
                  ? "stop"
                  : (activeTarget?.type ?? null)
              }
              onMapClick={(point: PickerPoint) =>
                activeTarget && setPointAndReturnToEditor(activeTarget, point)
              }
              isOpen
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function StepTitle({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold tracking-widest text-blue-700">
        PASO {number}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
function ResourceSelect({ icon, label, value, onChange, options }: any) {
  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon}
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
      >
        <option value="">Seleccionar {label.toLowerCase()}</option>
        {options.map((option: any) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label} · {option.detail}
          </option>
        ))}
      </select>
    </div>
  );
}
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
