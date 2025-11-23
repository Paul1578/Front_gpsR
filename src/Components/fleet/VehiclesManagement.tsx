import { useState } from "react";
import { useFleet, Vehicle } from "../../Context/FleetContext";
import { Plus, Edit, Trash2, Truck, Search, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "sonner";

interface VehiclesManagementProps {
  onBack?: () => void;
}

export function VehiclesManagement({ onBack }: VehiclesManagementProps = {}) {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useFleet();
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    placa: "",
    marca: "",
    modelo: "",
    anio: new Date().getFullYear(),
    estado: "disponible" as Vehicle["estado"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.placa || !formData.marca || !formData.modelo) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    if (editingVehicle) {
      const ok = await updateVehicle(editingVehicle.id, formData);
      if (ok) {
        toast.success("Vehículo actualizado exitosamente");
      } else {
        toast.error("No se pudo actualizar el vehículo");
        return;
      }
    } else {
      const ok = await addVehicle({
        ...formData,
        ubicacionActual: { lat: -12.0464, lng: -77.0428 },
      });
      if (ok) {
        toast.success("Vehículo agregado exitosamente");
      } else {
        toast.error("No se pudo crear el vehículo");
        return;
      }
    }

    resetForm();
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      placa: vehicle.placa,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      anio: vehicle.anio,
      estado: vehicle.estado,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteVehicle(id);
    if (ok) {
      toast.success("Vehículo eliminado exitosamente");
    } else {
      toast.error("No se pudo eliminar el vehículo");
    }
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      placa: "",
      marca: "",
      modelo: "",
      anio: new Date().getFullYear(),
      estado: "disponible",
    });
    setEditingVehicle(null);
    setShowForm(false);
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstadoBadge = (estado: Vehicle["estado"]) => {
    const styles = {
      disponible: "bg-green-100 text-green-700",
      en_ruta: "bg-blue-100 text-blue-700",
      mantenimiento: "bg-orange-100 text-orange-700",
    };
    const labels = {
      disponible: "Disponible",
      en_ruta: "En Ruta",
      mantenimiento: "Mantenimiento",
    };
    return <span className={`px-2 py-1 rounded text-xs ${styles[estado]}`}>{labels[estado]}</span>;
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
                <h2 className="text-xl md:text-2xl text-gray-900">Gestión de Vehículos</h2>
                <p className="text-sm text-gray-500 mt-1">Administra tu flota de vehículos</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm"
            >
              <Plus size={16} />
              Agregar Vehículo
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por placa, marca o modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Truck size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                {searchTerm ? "No se encontraron vehículos" : "No hay vehículos registrados"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck size={20} className="text-[#3271a4]" />
                      </div>
                      <div>
                        <h3 className="text-base text-gray-900">{vehicle.placa}</h3>
                        <p className="text-xs text-gray-500">
                          {vehicle.marca} {vehicle.modelo}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Año:</span>
                      <span className="text-gray-900">{vehicle.anio}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Estado:</span>
                      {getEstadoBadge(vehicle.estado)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-xs"
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(vehicle.id)}
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
        <DialogContent className="sm:max-w-md max-w-[90%]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {editingVehicle ? "Editar Vehículo" : "Agregar Vehículo"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700">Placa *</label>
              <input
                type="text"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                placeholder="ABC-123"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700">Marca *</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                placeholder="Toyota"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700">Modelo *</label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                placeholder="Hilux"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700">Año *</label>
              <input
                type="number"
                value={formData.anio}
                onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
                min="1990"
                max={new Date().getFullYear() + 1}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700">Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as Vehicle["estado"] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#3271a4] text-sm"
              >
                <option value="disponible">Disponible</option>
                <option value="en_ruta">En Ruta</option>
                <option value="mantenimiento">Mantenimiento</option>
              </select>
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
                {editingVehicle ? "Actualizar" : "Agregar"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar Vehículo"
        description="¿Estás seguro de que deseas eliminar este vehículo? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}
