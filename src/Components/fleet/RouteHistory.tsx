import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Truck,
  User,
  Package,
  Image as ImageIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  fetchRoutes,
  fetchVehicles,
  type RouteApiDto,
  type VehicleApiDto,
} from "@/services/fleetApi";

interface RouteHistoryProps {
  onBack?: () => void;
}

type StatusFilter = "all" | number | string;

const mapStatus = (status?: number | string) => {
  if (typeof status === "number") {
    if (status === 1) return "en_progreso";
    if (status === 2) return "completada";
    if (status === 3) return "cancelada";
    return "pendiente";
  }
  const key = (status ?? "").toString().toLowerCase();
  if (key.includes("progress") || key.includes("curso") || key.includes("progreso"))
    return "en_progreso";
  if (key.includes("complete") || key.includes("complet")) return "completada";
  if (key.includes("cancel")) return "cancelada";
  return "pendiente";
};

export function RouteHistory({ onBack }: RouteHistoryProps = {}) {
  const { apiFetch, getAllUsers } = useAuth();

  const [routes, setRoutes] = useState<RouteApiDto[]>([]);
  const [vehicles, setVehicles] = useState<VehicleApiDto[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteApiDto | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const users = getAllUsers();

  // ✅ Historial siempre desde BD (GET /api/Routes)
  useEffect(() => {
    if (!apiFetch) return;

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [routesRes, vehiclesRes] = await Promise.all([
          fetchRoutes(apiFetch),
          fetchVehicles(apiFetch),
        ]);

        console.log("[RouteHistory] fetch ok", {
          routes: routesRes?.length ?? 0,
          vehicles: vehiclesRes?.length ?? 0,
        });

        if (cancelled) return;
        setRoutes(routesRes);
        setVehicles(vehiclesRes);
      } catch (err) {
        console.error("Error cargando historial de rutas", err);
        if (!cancelled) setError("No se pudieron cargar las rutas");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    // carga inicial
    void load();

    // polling (en vivo desde BD)
    const intervalId = setInterval(() => {
      void load();
    }, 15000);

    // refresca al volver a la pestaña/ventana
    const onFocus = () => void load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [apiFetch]);

const filteredRoutes = useMemo(() => {
    return routes
      .filter((route) => {
        if (filterStatus === "all") return true;
        const estado = mapStatus(route.status);
        const filtroEstado = mapStatus(filterStatus);
        return estado === filtroEstado;
      })
      .sort(
        (a, b) =>
          new Date(b.plannedStart ?? "").getTime() -
          new Date(a.plannedStart ?? "").getTime()
      );
  }, [routes, filterStatus]);

  const getStatusIcon = (status?: number | string) => {
    const key =
      typeof status === "number" ? status : (status ?? "").toString().toLowerCase();

    switch (key) {
      case 2:
      case "completada":
        return <CheckCircle size={20} className="text-green-600" />;
      case 1:
      case "en_progreso":
      case "pendiente":
        return <Clock size={20} className="text-blue-600" />;
      case 3:
      case "cancelada":
        return <XCircle size={20} className="text-red-600" />;
      default:
        return <Clock size={20} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: number | string) => {
    const estado = mapStatus(status);
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
      <span
        className={`px-2 py-1 rounded text-xs ${
          styles[estado as keyof typeof styles] ?? "bg-gray-100 text-gray-700"
        }`}
      >
        {labels[estado as keyof typeof labels] ?? estado}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/D";
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
                Revisa todas las rutas y sus estados (datos en vivo)
              </p>
            </div>
          </div>

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
                onClick={() => setFilterStatus(filter.value as StatusFilter)}
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

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500">
              Cargando rutas...
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-red-500">
              {error}
            </div>
          )}

          {!isLoading && !error && filteredRoutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No hay rutas para mostrar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoutes.map((route) => {
                const vehicle = vehicles.find((v) => v.id === route.vehicleId);
                const driver = users.find((u) => u.id === route.driverId);

                return (
                  <div
                    key={route.id}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(route.status)}
                          <h3 className="text-base text-gray-900">{route.name}</h3>
                        </div>
                        <p className="text-xs text-gray-500">
                          Creada: {formatDate(route.plannedStart)}
                        </p>
                      </div>
                      {getStatusBadge(route.status)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Truck size={14} />
                        <span>
                          {vehicle?.plate || "N/A"} - {vehicle?.brand} {vehicle?.model}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600">
                        <User size={14} />
                        <span>
                          {driver ? `${driver.nombres} ${driver.apellidos}` : "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600">
                        <Package size={14} />
                        <span>{route.cargoDescription ?? "Sin carga"}</span>
                      </div>

                      {(route as any).evidencias &&
                        (route as any).evidencias.length > 0 && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <ImageIcon size={14} />
                            <span>{(route as any).evidencias.length} evidencia(s)</span>
                          </div>
                        )}
                    </div>

                    {route.plannedStart && (
                      <div className="text-xs text-gray-500 mb-2">
                        Iniciada: {formatDate(route.plannedStart)}
                      </div>
                    )}

                    {route.plannedEnd && (
                      <div className="text-xs text-gray-500 mb-2">
                        Finalizada: {formatDate(route.plannedEnd)}
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

      <Dialog open={!!selectedRoute} onOpenChange={() => setSelectedRoute(null)}>
        <DialogContent
          className="sm:max-w-2xl max-w-[95%] max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Detalles de la Ruta
            </DialogTitle>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base">{selectedRoute.name}</h3>
                {getStatusBadge(selectedRoute.status)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Vehículo</label>
                  <p className="text-sm text-gray-900">
                    {vehicles.find((v) => v.id === selectedRoute.vehicleId)?.plate ||
                      "N/A"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Conductor</label>
                  <p className="text-sm text-gray-900">
                    {(() => {
                      const driver = users.find((u) => u.id === selectedRoute.driverId);
                      return driver
                        ? `${driver.nombres} ${driver.apellidos}`
                        : "N/A";
                    })()}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Carga</label>
                  <p className="text-sm text-gray-900">
                    {selectedRoute.cargoDescription ?? "N/A"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Fecha Creación
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedRoute.plannedStart)}
                  </p>
                </div>

                {selectedRoute.plannedStart && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Fecha Inicio
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedRoute.plannedStart)}
                    </p>
                  </div>
                )}

                {selectedRoute.plannedEnd && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha Fin</label>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedRoute.plannedEnd)}
                    </p>
                  </div>
                )}
              </div>

              {selectedRoute.points && selectedRoute.points.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">
                    Puntos de Entrega
                  </label>
                  <div className="space-y-2">
                    {selectedRoute.points.map((punto, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        {index + 1}. {punto.name ?? "Punto"}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedRoute as any).notas && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notas</label>
                  <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded">
                    {(selectedRoute as any).notas}
                  </p>
                </div>
              )}

              {(selectedRoute as any).evidencias &&
                (selectedRoute as any).evidencias.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">
                      Evidencias
                    </label>
                    <div className="space-y-3">
                      {(selectedRoute as any).evidencias.map((evidencia: any) => (
                        <div key={evidencia.id} className="p-3 bg-gray-50 rounded">
                          {evidencia.type === "image" ? (
                            <div>
                              <img
                                src={evidencia.content}
                                alt="Evidencia"
                                className="w-full rounded mb-2"
                              />
                              {evidencia.description && (
                                <p className="text-xs text-gray-600">
                                  {evidencia.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDate(evidencia.timestamp)}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-900 mb-1">
                                {evidencia.content}
                              </p>
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
