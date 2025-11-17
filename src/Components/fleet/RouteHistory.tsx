import { useState } from "react";
import { useFleet, Route } from "../../Context/FleetContext";
import { useAuth } from "../../Context/AuthContext";
import { ArrowLeft, Calendar, CheckCircle, Clock, XCircle, Eye, Truck, User, Package, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

interface RouteHistoryProps {
  onBack?: () => void;
}

export function RouteHistory({ onBack }: RouteHistoryProps = {}) {
  const { routes, vehicles } = useFleet();
  const { getAllUsers } = useAuth();
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | Route["estado"]>("all");

  const users = getAllUsers();

  const filteredRoutes = routes
    .filter(route => filterStatus === "all" || route.estado === filterStatus)
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

  const getStatusIcon = (estado: Route["estado"]) => {
    switch (estado) {
      case "completada":
        return <CheckCircle size={20} className="text-green-600" />;
      case "en_progreso":
        return <Clock size={20} className="text-blue-600" />;
      case "pendiente":
        return <Clock size={20} className="text-yellow-600" />;
      case "cancelada":
        return <XCircle size={20} className="text-red-600" />;
    }
  };

  const getStatusBadge = (estado: Route["estado"]) => {
    const styles = {
      completada: "bg-green-100 text-green-700",
      en_progreso: "bg-blue-100 text-blue-700",
      pendiente: "bg-yellow-100 text-yellow-700",
      cancelada: "bg-red-100 text-red-700",
    };
    const labels = {
      completada: "Completada",
      en_progreso: "En Progreso",
      pendiente: "Pendiente",
      cancelada: "Cancelada",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[estado]}`}>
        {labels[estado]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-xl md:text-2xl text-gray-900">Historial de Rutas</h2>
              <p className="text-sm text-gray-500 mt-1">
                Revisa todas las rutas y sus estados
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { value: "all", label: "Todas" },
              { value: "completada", label: "Completadas" },
              { value: "en_progreso", label: "En Progreso" },
              { value: "pendiente", label: "Pendientes" },
              { value: "cancelada", label: "Canceladas" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value as any)}
                className={`px-4 py-2 rounded-lg text-xs whitespace-nowrap transition-all ${
                  filterStatus === filter.value
                    ? "bg-[#3271a4] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Routes List */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {filteredRoutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No hay rutas para mostrar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoutes.map((route) => {
                const vehicle = vehicles.find(v => v.id === route.vehiculoId);
                const driver = users.find(u => u.id === route.conductorId);

                return (
                  <div
                    key={route.id}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(route.estado)}
                          <h3 className="text-base text-gray-900">{route.nombre}</h3>
                        </div>
                        <p className="text-xs text-gray-500">
                          Creada: {formatDate(route.fechaCreacion)}
                        </p>
                      </div>
                      {getStatusBadge(route.estado)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Truck size={14} />
                        <span>{vehicle?.placa || "N/A"} - {vehicle?.marca} {vehicle?.modelo}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <User size={14} />
                        <span>{driver?.nombres} {driver?.apellidos}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Package size={14} />
                        <span>{route.carga}</span>
                      </div>
                      {route.evidencias && route.evidencias.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <ImageIcon size={14} />
                          <span>{route.evidencias.length} evidencia(s)</span>
                        </div>
                      )}
                    </div>

                    {route.fechaInicio && (
                      <div className="text-xs text-gray-500 mb-2">
                        Iniciada: {formatDate(route.fechaInicio)}
                      </div>
                    )}

                    {route.fechaFin && (
                      <div className="text-xs text-gray-500 mb-2">
                        Finalizada: {formatDate(route.fechaFin)}
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedRoute(route)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                    >
                      <Eye size={14} />
                      Ver Detalles
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Route Details Dialog */}
      <Dialog open={!!selectedRoute} onOpenChange={() => setSelectedRoute(null)}>
        <DialogContent className="sm:max-w-2xl max-w-[95%] max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Detalles de la Ruta
            </DialogTitle>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base">{selectedRoute.nombre}</h3>
                {getStatusBadge(selectedRoute.estado)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Vehículo</label>
                  <p className="text-sm text-gray-900">
                    {vehicles.find(v => v.id === selectedRoute.vehiculoId)?.placa || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Conductor</label>
                  <p className="text-sm text-gray-900">
                    {(() => {
                      const driver = users.find(u => u.id === selectedRoute.conductorId);
                      return driver ? `${driver.nombres} ${driver.apellidos}` : "N/A";
                    })()}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Carga</label>
                  <p className="text-sm text-gray-900">{selectedRoute.carga}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha Creación</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedRoute.fechaCreacion)}</p>
                </div>
                {selectedRoute.fechaInicio && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha Inicio</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedRoute.fechaInicio)}</p>
                  </div>
                )}
                {selectedRoute.fechaFin && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha Fin</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedRoute.fechaFin)}</p>
                  </div>
                )}
              </div>

              {selectedRoute.puntos && selectedRoute.puntos.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Puntos de Entrega</label>
                  <div className="space-y-2">
                    {selectedRoute.puntos.map((punto, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        {index + 1}. {punto.nombre}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRoute.notas && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notas</label>
                  <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded">{selectedRoute.notas}</p>
                </div>
              )}

              {selectedRoute.evidencias && selectedRoute.evidencias.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Evidencias</label>
                  <div className="space-y-3">
                    {selectedRoute.evidencias.map((evidencia) => (
                      <div key={evidencia.id} className="p-3 bg-gray-50 rounded">
                        {evidencia.type === "image" ? (
                          <div>
                            <img
                              src={evidencia.content}
                              alt="Evidencia"
                              className="w-full rounded mb-2"
                            />
                            {evidencia.description && (
                              <p className="text-xs text-gray-600">{evidencia.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(evidencia.timestamp)}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-900 mb-1">{evidencia.content}</p>
                            <p className="text-xs text-gray-400">
                              {formatDate(evidencia.timestamp)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedRoute(null)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
              >
                Cerrar
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
