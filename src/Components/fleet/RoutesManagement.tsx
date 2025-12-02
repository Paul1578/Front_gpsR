"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useFleet, Route } from "../../Context/FleetContext";
import { useAuth } from "../../Context/AuthContext";
import { Plus, Edit, Trash2, Route as RouteIcon, MapPin, ArrowLeft, MoveUp, MoveDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "sonner";
import type { PickerPoint, SelectionMode } from "./RoutePickerMap";
import type { LatLngExpression } from "leaflet";

const RoutePickerMap = dynamic(() => import("./RoutePickerMap"), { ssr: false });

interface RoutesManagementProps {
  onBack?: () => void;
}

type RouteStatus = Route["estado"];

const DEFAULT_POINT: PickerPoint = { lat: -12.0464, lng: -77.0428, nombre: "Punto" };

const normalizePickerPoint = (p: any): PickerPoint | null => {
  const latRaw = p?.lat ?? p?.latitude ?? p?.latitud;
  const lngRaw = p?.lng ?? p?.longitude ?? p?.longitud;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return null;
  return { lat, lng, nombre: p?.nombre ?? p?.name ?? "" };
};

export function RoutesManagement({ onBack }: RoutesManagementProps = {}) {
  const { routes, vehicles, addRoute, updateRoute, deleteRoute } = useFleet();
  const { getTeamUsers } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const users = getTeamUsers();
  const drivers = users
    .filter((u) => ["chofer", "logistica", "gerente"].includes(u.role))
    .map((u) => ({ ...u, driverKey: u.driverId ?? u.id }))
    .filter((u) => !!u.driverKey);
  const availableVehicles = vehicles.filter((v) => v.estado === "disponible");

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

  const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
  const [pendingPoint, setPendingPoint] = useState<PickerPoint | null>(null);

  const resetForm = () => {
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
    setEditingRoute(null);
    setShowForm(false);
    setSelectionMode("none");
    setPendingPoint(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.vehicleId || !formData.driverId || !formData.cargoDescription) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    if (!formData.origin) {
      toast.error("Selecciona un origen");
      return;
    }
    if (!formData.destination) {
      toast.error("Selecciona un destino");
      return;
    }
    if (
      !Number.isFinite(formData.origin.lat) ||
      !Number.isFinite(formData.origin.lng) ||
      Math.abs(formData.origin.lat) < 0.000001 ||
      Math.abs(formData.origin.lng) < 0.000001
    ) {
      toast.error("Coordenadas de origen invalidas");
      return;
    }
    if (
      !Number.isFinite(formData.destination.lat) ||
      !Number.isFinite(formData.destination.lng) ||
      Math.abs(formData.destination.lat) < 0.000001 ||
      Math.abs(formData.destination.lng) < 0.000001
    ) {
      toast.error("Coordenadas de destino invalidas");
      return;
    }

    const allPoints = [formData.origin, ...formData.stops, formData.destination];
    for (const p of allPoints) {
      if (Number.isNaN(p.lat) || Number.isNaN(p.lng)) {
        toast.error("Latitud y longitud deben ser numericas");
        return;
      }
      if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
        toast.error("Latitud debe estar entre -90 y 90, longitud entre -180 y 180");
        return;
      }
      if (Math.abs(p.lat) < 0.0001 && Math.abs(p.lng) < 0.0001) {
        toast.error("Coordenadas invalidas (0,0)");
        return;
      }
    }

    const payload: Omit<Route, "id" | "fechaCreacion"> = {
      nombre: formData.name,
      vehiculoId: formData.vehicleId,
      conductorId: formData.driverId,
      carga: formData.cargoDescription,
      origen: {
        lat: Number(formData.origin.lat ?? 0),
        lng: Number(formData.origin.lng ?? 0),
        nombre: formData.origin.nombre ?? "Origen",
      },
      destino: {
        lat: Number(formData.destination.lat ?? 0),
        lng: Number(formData.destination.lng ?? 0),
        nombre: formData.destination.nombre ?? "Destino",
      },
      puntos: formData.stops.map((p, idx) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
        nombre: p.nombre ?? `Parada ${idx + 1}`,
      })),
      estado: formData.status ?? "pendiente",
      fechaInicio: undefined,
      fechaFin: undefined,
      teamId: undefined,
    };

    if (editingRoute) {
      const result = await updateRoute(editingRoute.id, payload);
      if (result.ok) {
        toast.success(result.message ?? "Ruta actualizada exitosamente");
        resetForm();
      } else {
        toast.error(result.message ?? "No se pudo guardar la ruta");
      }
      return;
    }

    const result = await addRoute(payload);
    if (result.ok) {
      toast.success(result.message ?? "Ruta creada exitosamente");
      resetForm();
    } else {
      toast.error(result.message ?? "No se pudo guardar la ruta");
    }
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
      status: (route.estado as RouteStatus) ?? "pendiente",
    });
    setShowForm(true);
    setSelectionMode("none");
    setPendingPoint(null);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteRoute(id);
    if (result.ok) toast.success(result.message ?? "Ruta eliminada exitosamente");
    else toast.error(result.message ?? "No se pudo eliminar la ruta");
    setDeleteConfirm(null);
  };

  const removeStop = (index: number) => {
    setFormData((prev) => ({ ...prev, stops: prev.stops.filter((_, i) => i !== index) }));
  };

  const moveStop = (index: number, direction: "up" | "down") => {
    setFormData((prev) => {
      const stops = [...prev.stops];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= stops.length) return prev;
      [stops[index], stops[target]] = [stops[target], stops[index]];
      return { ...prev, stops };
    });
  };

  const updateStop = (index: number, field: "nombre" | "lat" | "lng", value: string) => {
    setFormData((prev) => {
      const stops = [...prev.stops];
      stops[index] = { ...stops[index], [field]: field === "nombre" ? value : Number(value) };
      return { ...prev, stops };
    });
  };

  const mapCenter: LatLngExpression = useMemo(() => {
    const preferred = formData.origin ?? formData.stops[0] ?? formData.destination;
    if (preferred && Number.isFinite(preferred.lat) && Number.isFinite(preferred.lng)) {
      return [preferred.lat, preferred.lng];
    }
    return [DEFAULT_POINT.lat, DEFAULT_POINT.lng];
  }, [formData.origin, formData.stops, formData.destination]);

  const getEstadoBadge = (estado: string | undefined) => {
    const key = typeof estado === "string" ? estado.toLowerCase() : "";
    const styles: Record<string, string> = {
      pendiente: "bg-yellow-100 text-yellow-700",
      en_progreso: "bg-blue-100 text-blue-700",
      completada: "bg-green-100 text-green-700",
      cancelada: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
      inprogress: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      pendiente: "Pendiente",
      en_progreso: "En Progreso",
      completada: "Completada",
      cancelada: "Cancelada",
      pending: "Pendiente",
      inprogress: "En Progreso",
      completed: "Completada",
      cancelled: "Cancelada",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[key] ?? "bg-gray-100 text-gray-700"}`}>
        {labels[key] ?? estado}
      </span>
    );
  };

  const getVehicleName = (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    return vehicle ? `${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}` : "N/A";
  };

  const getDriverName = (id: string) => {
    const driver = users.find((u) => u.driverId === id || u.id === id);
    return driver ? `${driver.nombres ?? ""} ${driver.apellidos ?? ""}`.trim() || driver.usuario : "N/A";
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
              )}
              <div>
                <h2 className="text-xl md:text-2xl text-gray-900">Gestión de Rutas</h2>
                <p className="text-sm text-gray-500 mt-1">Crea y administra las rutas de entrega</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setSelectionMode("none");
                setPendingPoint(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm"
            >
              <Plus size={16} />
              Crear Ruta
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RouteIcon size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No hay rutas registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <RouteIcon size={20} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base text-gray-900">{route.nombre}</h3>
                        <p className="text-xs text-gray-500">Creada el {new Date(route.fechaCreacion).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {getEstadoBadge(route.estado)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="text-gray-500">Vehículo:</span>
                        <p className="text-gray-900 mt-0.5">{getVehicleName(route.vehiculoId)}</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Conductor:</span>
                        <p className="text-gray-900 mt-0.5">{getDriverName(route.conductorId)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="text-gray-500">Carga:</span>
                        <p className="text-gray-900 mt-0.5">{route.carga}</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Paradas:</span>
                        <p className="text-gray-900 mt-0.5">{route.puntos.length} puntos</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(route)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-xs"
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(route.id)}
                      className="flex items-center justify-center px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={resetForm}>
        <DialogContent className="sm:max-w-5xl max-w-[98%] max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{editingRoute ? "Editar Ruta" : "Crear Ruta"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700">Nombre de la Ruta *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                placeholder="Ruta Centro - Norte"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-700">Vehículo *</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                  required
                >
                  <option value="">Seleccionar vehículo</option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.placa} - {vehicle.marca} {vehicle.modelo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700">Conductor *</label>
                <select
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                  required
                >
                  <option value="">Seleccionar conductor</option>
                  {drivers.map((driver) => (
                    <option key={driver.driverKey} value={driver.driverKey}>
                      {driver.nombres} {driver.apellidos} ({driver.usuario})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700">Descripción de la Carga *</label>
              <textarea
                value={formData.cargoDescription}
                onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                placeholder="Especifica que productos o items se entregaran..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-gray-700">Selección en el mapa</label>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode("origin");
                      toast.info("Haz clic en el mapa para fijar el origen y luego confirma");
                    }}
                    className={`px-2 py-1 rounded border ${selectionMode === "origin" ? "border-[#3271a4] text-[#3271a4]" : "border-gray-200 text-gray-700"}`}
                  >
                    Seleccionar origen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode("stop");
                      toast.info("Haz clic en el mapa para agregar una parada y confirma");
                    }}
                    className={`px-2 py-1 rounded border ${selectionMode === "stop" ? "border-[#3271a4] text-[#3271a4]" : "border-gray-200 text-gray-700"}`}
                  >
                    Agregar parada
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode("destination");
                      toast.info("Haz clic en el mapa para fijar el destino y confirma");
                    }}
                    className={`px-2 py-1 rounded border ${selectionMode === "destination" ? "border-[#3271a4] text-[#3271a4]" : "border-gray-200 text-gray-700"}`}
                  >
                    Seleccionar destino
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, origin: null, stops: [], destination: null }));
                      setPendingPoint(null);
                      setSelectionMode("none");
                    }}
                    className="px-2 py-1 rounded border border-gray-200 text-gray-700"
                  >
                    Limpiar ruta
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                <div className="p-3 border border-gray-200 rounded-lg bg-green-50">
                  <p className="text-xs text-gray-700 mb-2">Origen</p>
                  {formData.origin ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        value={formData.origin.nombre ?? ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, origin: { ...prev.origin!, nombre: e.target.value } }))}
                        className="px-2 py-1 border border-gray-200 rounded"
                        placeholder="Nombre"
                      />
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          step="any"
                          value={formData.origin.lat ?? ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              origin: { ...prev.origin!, lat: e.target.value === "" ? 0 : Number(e.target.value) },
                            }))
                          }
                          className="px-2 py-1 border border-gray-200 rounded"
                          placeholder="Lat"
                        />
                        <input
                          type="number"
                          step="any"
                          value={formData.origin.lng ?? ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              origin: { ...prev.origin!, lng: e.target.value === "" ? 0 : Number(e.target.value) },
                            }))
                          }
                          className="px-2 py-1 border border-gray-200 rounded"
                          placeholder="Lng"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Sin origen. Selecciona en el mapa.</p>
                  )}
                </div>

                <div className="p-3 border border-gray-200 rounded-lg bg-blue-50">
                  <p className="text-xs text-gray-700 mb-2">Paradas</p>
                  {formData.stops.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin paradas.</p>
                  ) : (
                    formData.stops.map((stop, index) => (
                      <div key={index} className="mb-2 p-2 bg-white rounded border border-gray-200">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <input
                            type="text"
                            value={stop.nombre ?? ""}
                            onChange={(e) => updateStop(index, "nombre", e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-200 rounded mr-2"
                            placeholder={`Parada ${index + 1}`}
                          />
                          <div className="flex gap-1">
                            <button type="button" onClick={() => moveStop(index, "up")} className="p-1 text-gray-500 hover:text-gray-800">
                              <MoveUp size={14} />
                            </button>
                            <button type="button" onClick={() => moveStop(index, "down")} className="p-1 text-gray-500 hover:text-gray-800">
                              <MoveDown size={14} />
                            </button>
                            <button type="button" onClick={() => removeStop(index)} className="p-1 text-red-500 hover:text-red-700">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <input
                          type="number"
                          step="any"
                          value={stop.lat ?? ""}
                          onChange={(e) => updateStop(index, "lat", e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded"
                          placeholder="Lat"
                        />
                          <input
                            type="number"
                            step="any"
                            value={stop.lng ?? ""}
                            onChange={(e) => updateStop(index, "lng", e.target.value)}
                            className="px-2 py-1 border border-gray-200 rounded"
                            placeholder="Lng"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border border-gray-200 rounded-lg bg-red-50">
                  <p className="text-xs text-gray-700 mb-2">Destino</p>
                  {formData.destination ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        value={formData.destination.nombre ?? ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, destination: { ...prev.destination!, nombre: e.target.value } }))}
                        className="px-2 py-1 border border-gray-200 rounded"
                        placeholder="Nombre"
                      />
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          step="any"
                          value={formData.destination.lat ?? ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              destination: { ...prev.destination!, lat: e.target.value === "" ? 0 : Number(e.target.value) },
                            }))
                          }
                          className="px-2 py-1 border border-gray-200 rounded"
                          placeholder="Lat"
                        />
                        <input
                          type="number"
                          step="any"
                          value={formData.destination.lng ?? ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              destination: { ...prev.destination!, lng: e.target.value === "" ? 0 : Number(e.target.value) },
                            }))
                          }
                          className="px-2 py-1 border border-gray-200 rounded"
                          placeholder="Lng"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Sin destino. Selecciona en el mapa.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Ajusta desde el mapa</span>
                <span className="text-xs text-gray-500">Click en el mapa según el modo seleccionado. Confirma antes de guardar.</span>
              </div>
              <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
                <RoutePickerMap
                  origin={formData.origin}
                  stops={formData.stops}
                  destination={formData.destination}
                  pendingPoint={pendingPoint}
                  selectionMode={selectionMode}
                  onMapClick={(p) => {
                    const normalized = normalizePickerPoint(p);
                    if (!normalized) return;
                    setPendingPoint(normalized);
                  }}
                  onConfirmPending={() => {
                    if (!pendingPoint) return;
                    const normalized = normalizePickerPoint(pendingPoint);
                    if (!normalized) {
                      toast.error("No se pudo leer el punto seleccionado");
                      return;
                    }
                    if (selectionMode === "origin") {
                      setFormData((prev) => ({ ...prev, origin: { ...normalized, nombre: normalized.nombre || "Origen" } }));
                    } else if (selectionMode === "destination") {
                      setFormData((prev) => ({ ...prev, destination: { ...normalized, nombre: normalized.nombre || "Destino" } }));
                    } else if (selectionMode === "stop") {
                      setFormData((prev) => ({
                        ...prev,
                        stops: [...prev.stops, { ...normalized, nombre: normalized.nombre || `Parada ${prev.stops.length + 1}` }],
                      }));
                    }
                    setPendingPoint(null);
                    setSelectionMode("none");
                  }}
                  onCancelPending={() => {
                    setPendingPoint(null);
                    setSelectionMode("none");
                  }}
                  isOpen={showForm}
                />
              </div>
              {pendingPoint && (
                <div className="flex items-center gap-3 text-xs text-gray-700 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                  <span>
                    Punto seleccionado: {pendingPoint.lat.toFixed(5)}, {pendingPoint.lng.toFixed(5)} ({selectionMode})
                  </span>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 bg-[#3271a4] text-white rounded flex items-center gap-1"
                      onClick={() => {
                        if (!pendingPoint) return;
                        const normalized = normalizePickerPoint(pendingPoint);
                        if (!normalized) {
                          toast.error("No se pudo leer el punto seleccionado");
                          return;
                        }
                        if (selectionMode === "origin") {
                          setFormData((prev) => ({ ...prev, origin: { ...normalized, nombre: normalized.nombre || "Origen" } }));
                        } else if (selectionMode === "destination") {
                          setFormData((prev) => ({ ...prev, destination: { ...normalized, nombre: normalized.nombre || "Destino" } }));
                        } else if (selectionMode === "stop") {
                          setFormData((prev) => ({
                            ...prev,
                            stops: [...prev.stops, { ...normalized, nombre: normalized.nombre || `Parada ${prev.stops.length + 1}` }],
                          }));
                        }
                        setPendingPoint(null);
                        setSelectionMode("none");
                      }}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded flex items-center gap-1"
                      onClick={() => {
                        setPendingPoint(null);
                        setSelectionMode("none");
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm"
              >
                {editingRoute ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar Ruta"
        description="¿Estás seguro de que deseas eliminar esta ruta? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}
