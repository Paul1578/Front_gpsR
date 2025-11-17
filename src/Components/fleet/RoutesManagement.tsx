import { useState } from "react";
import { useFleet, Route } from "../../Context/FleetContext";
import { useAuth } from "../../Context/AuthContext";
import { Plus, Edit, Trash2, Route as RouteIcon, MapPin, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "sonner";

interface RoutesManagementProps {
  onBack?: () => void;
}

export function RoutesManagement({ onBack }: RoutesManagementProps = {}) {
  const { routes, vehicles, addRoute, updateRoute, deleteRoute } = useFleet();
  const { getAllUsers, user: currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const users = getAllUsers();
  // Permitir asignar rutas a choferes, logística Y gerentes
  const drivers = users.filter(u => u.role === "chofer" || u.role === "logistica" || u.role === "gerente");
  const availableVehicles = vehicles.filter(v => v.estado === "disponible");

  const [formData, setFormData] = useState({
    nombre: "",
    vehiculoId: "",
    conductorId: "",
    carga: "",
    estado: "pendiente" as Route["estado"],
    puntos: [{ lat: -12.0464, lng: -77.0428, nombre: "Punto de inicio" }],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.vehiculoId || !formData.conductorId || !formData.carga) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    if (editingRoute) {
      updateRoute(editingRoute.id, formData);
      toast.success("Ruta actualizada exitosamente");
    } else {
      addRoute(formData);
      toast.success("Ruta creada exitosamente");
    }

    resetForm();
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      nombre: route.nombre,
      vehiculoId: route.vehiculoId,
      conductorId: route.conductorId,
      carga: route.carga,
      estado: route.estado,
      puntos: route.puntos,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteRoute(id);
    toast.success("Ruta eliminada exitosamente");
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      vehiculoId: "",
      conductorId: "",
      carga: "",
      estado: "pendiente",
      puntos: [{ lat: -12.0464, lng: -77.0428, nombre: "Punto de inicio" }],
    });
    setEditingRoute(null);
    setShowForm(false);
  };

  const addPunto = () => {
    setFormData({
      ...formData,
      puntos: [
        ...formData.puntos,
        { lat: -12.0464, lng: -77.0428, nombre: `Punto ${formData.puntos.length + 1}` },
      ],
    });
  };

  const removePunto = (index: number) => {
    if (formData.puntos.length > 1) {
      setFormData({
        ...formData,
        puntos: formData.puntos.filter((_, i) => i !== index),
      });
    }
  };

  const updatePunto = (index: number, nombre: string) => {
    const newPuntos = [...formData.puntos];
    newPuntos[index] = { ...newPuntos[index], nombre };
    setFormData({ ...formData, puntos: newPuntos });
  };

  const getEstadoBadge = (estado: Route["estado"]) => {
    const styles = {
      pendiente: "bg-yellow-100 text-yellow-700",
      en_progreso: "bg-blue-100 text-blue-700",
      completada: "bg-green-100 text-green-700",
      cancelada: "bg-red-100 text-red-700",
    };
    const labels = {
      pendiente: "Pendiente",
      en_progreso: "En Progreso",
      completada: "Completada",
      cancelada: "Cancelada",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[estado]}`}>
        {labels[estado]}
      </span>
    );
  };

  const getVehicleName = (id: string) => {
    const vehicle = vehicles.find(v => v.id === id);
    return vehicle ? `${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}` : "N/A";
  };

  const getDriverName = (id: string) => {
    const driver = users.find(u => u.id === id);
    return driver ? `${driver.nombres} ${driver.apellidos}` : "N/A";
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
                <h2 className="text-xl md:text-2xl text-gray-900">Gestión de Rutas</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Crea y administra las rutas de entrega
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm"
            >
              <Plus size={16} />
              Crear Ruta
            </button>
          </div>
        </div>

        {/* Routes List */}
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
                        <p className="text-xs text-gray-500">
                          Creada el {new Date(route.fechaCreacion).toLocaleDateString()}
                        </p>
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={resetForm}>
        <DialogContent className="sm:max-w-2xl max-w-[95%] max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {editingRoute ? "Editar Ruta" : "Crear Ruta"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700">Nombre de la Ruta *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                placeholder="Ruta Centro - Norte"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-700">Vehículo *</label>
                <select
                  value={formData.vehiculoId}
                  onChange={(e) => setFormData({ ...formData, vehiculoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                  required
                >
                  <option value="">Seleccionar vehículo</option>
                  {(editingRoute ? vehicles : availableVehicles).map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.placa} - {vehicle.marca} {vehicle.modelo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700">Conductor *</label>
                <select
                  value={formData.conductorId}
                  onChange={(e) => setFormData({ ...formData, conductorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                  required
                >
                  <option value="">Seleccionar conductor</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.nombres} {driver.apellidos}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700">Descripción de la Carga *</label>
              <textarea
                value={formData.carga}
                onChange={(e) => setFormData({ ...formData, carga: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                placeholder="Especifica qué productos o items se entregarán..."
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700">Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as Route["estado"] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En Progreso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-gray-700">Puntos de Parada</label>
                <button
                  type="button"
                  onClick={addPunto}
                  className="text-xs text-[#3271a4] hover:underline flex items-center gap-1"
                >
                  <Plus size={14} />
                  Agregar punto
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.puntos.map((punto, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={punto.nombre}
                        onChange={(e) => updatePunto(index, e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm"
                        placeholder="Nombre del punto"
                      />
                    </div>
                    {formData.puntos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePunto(index)}
                        className="px-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
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

      {/* Delete Confirmation */}
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
