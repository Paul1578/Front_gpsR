'use client';

import { useEffect, useState, useRef } from "react";
import { useFleet } from "@/context/FleetContext";
import { useAuth } from "@/context/AuthContext";
import { MapPin, Navigation, RefreshCw, ArrowLeft } from "lucide-react";

interface MapViewProps {
  onBack?: () => void;
}

export default function MapView({ onBack }: MapViewProps = {}) {
  const { vehicles, routes } = useFleet();
  const { getAllUsers } = useAuth();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const activeRoutes = routes.filter(
    (r) => r.estado === "en_progreso" || r.estado === "pendiente"
  );
  const users = getAllUsers();

  // Simular actualizaciones de ubicación en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulación: actualización de ubicaciones
      // En producción vendría de WebSocket o API
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getDriverName = (driverId: string) => {
    const driver = users.find((u) => u.id === driverId);
    return driver ? `${driver.nombres} ${driver.apellidos}` : "Sin asignar";
  };

  return (
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
              <h2 className="text-xl md:text-2xl text-gray-900">
                Mapa en Tiempo Real
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Monitorea tus vehículos y rutas en tiempo real
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm">
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Área del Mapa */}
        <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-indigo-50">
          <div ref={mapRef} className="absolute inset-0 flex items-center justify-center">
            {/* Mapa simulado */}
            <div className="w-full h-full relative overflow-hidden">
              {/* Grid */}
              <div className="absolute inset-0 opacity-10">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute left-0 right-0 border-b border-gray-400"
                    style={{ top: `${i * 5}%` }}
                  />
                ))}
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute top-0 bottom-0 border-r border-gray-400"
                    style={{ left: `${i * 5}%` }}
                  />
                ))}
              </div>

              {/* Vehículos */}
              {vehicles
                .filter((v) => v.estado === "en_ruta" && v.ubicacionActual)
                .map((vehicle, index) => (
                  <button
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                      selectedVehicle === vehicle.id ? "scale-125 z-10" : ""
                    }`}
                    style={{
                      left: `${30 + index * 15}%`,
                      top: `${40 + index * 10}%`,
                    }}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-[#3271a4] rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow border-4 border-white">
                        <Navigation size={20} className="transform rotate-45" />
                      </div>
                      {selectedVehicle === vehicle.id && (
                        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap text-xs border border-gray-200">
                          <p className="text-gray-900">{vehicle.placa}</p>
                          <p className="text-gray-500">
                            {vehicle.marca} {vehicle.modelo}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}

              {/* Centro del mapa */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <MapPin size={32} className="text-gray-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            <h3 className="text-base text-gray-900 mb-4">Rutas Activas</h3>

            {activeRoutes.length === 0 ? (
              <div className="text-center py-8">
                <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No hay rutas activas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRoutes.map((route) => {
                  const vehicle = vehicles.find((v) => v.id === route.vehiculoId);
                  return (
                    <div
                      key={route.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#3271a4] transition-colors cursor-pointer"
                      onClick={() => setSelectedVehicle(route.vehiculoId)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm text-gray-900">{route.nombre}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            route.estado === "en_progreso"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {route.estado === "en_progreso" ? "En curso" : "Pendiente"}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>
                          <strong>Vehículo:</strong> {vehicle?.placa || "N/A"}
                        </p>
                        <p>
                          <strong>Conductor:</strong> {getDriverName(route.conductorId)}
                        </p>
                        <p>
                          <strong>Carga:</strong> {route.carga}
                        </p>
                        <p>
                          <strong>Puntos:</strong> {route.puntos.length} paradas
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resumen */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-base text-gray-900 mb-3">Resumen</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600">Vehículos Activos</p>
                  <p className="text-xl text-gray-900 mt-1">
                    {vehicles.filter((v) => v.estado === "en_ruta").length}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600">Rutas en Curso</p>
                  <p className="text-xl text-gray-900 mt-1">
                    {activeRoutes.filter((r) => r.estado === "en_progreso").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
