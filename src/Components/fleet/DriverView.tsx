import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useFleet } from "../../Context/FleetContext";
import { useAuth } from "../../Context/AuthContext";
import { MapPin, Package, Navigation, CheckCircle, ArrowLeft, Camera, FileText, Upload, Play, Pause, Compass, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
const DriverRouteMap = dynamic(() => import("./DriverRouteMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100" />,
});

interface DriverViewProps {
  onBack?: () => void;
}


export function DriverView({ onBack }: DriverViewProps = {}) {
  const {
    routes,
    vehicles,
    drivers,
    refreshDrivers,
    updateRoute,
    addRouteEvidence,
    updateVehicleLocation,
    registerRoutePosition,
  } = useFleet();
  const { user } = useAuth();
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [evidenceType, setEvidenceType] = useState<"image" | "note">("image");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const locationSendCooldownRef = useRef(false);
  const [isUsingGeolocation, setIsUsingGeolocation] = useState(false);

  const driverId =
    user?.driverId ?? drivers.find((driver) => driver.userId === user?.id)?.id;

  useEffect(() => {
    if (!user) return;
    if (user.role === "chofer") return;
    if (driverId) return;
    if (drivers.length) return;
    void refreshDrivers();
  }, [driverId, drivers.length, refreshDrivers, user]);

  const myRoutes = routes.filter((r) => r.conductorId === driverId);
  const activeRoute = myRoutes.find(r => r.estado === "en_progreso" || r.estado === "pendiente");
  const fallbackLocation: [number, number] | null = (() => {
    if (!activeRoute) return null;
    const vehicle = vehicles.find((v) => v.id === activeRoute.vehiculoId);
    if (vehicle?.ubicacionActual) {
      return [vehicle.ubicacionActual.lat, vehicle.ubicacionActual.lng];
    }
    if (activeRoute.puntos.length > 0) {
      return [activeRoute.puntos[0].lat, activeRoute.puntos[0].lng];
    }
    return null;
  })();
  const effectiveCurrentLocation = currentLocation ?? fallbackLocation;

  useEffect(() => {
    if (!activeRoute) return;
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setIsUsingGeolocation(true);
        setCurrentLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setIsUsingGeolocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(id);
      setIsUsingGeolocation(false);
    };
  }, [activeRoute]);

  useEffect(() => {
    if (!activeRoute) {
      return;
    }
    if (isUsingGeolocation) return;

    const interval = setInterval(() => {
      if (activeRoute.estado === "en_progreso" && activeRoute.puntos.length > 0) {
        setCurrentLocation(prev => {
          if (!prev) return [activeRoute.puntos[0].lat, activeRoute.puntos[0].lng];
          
          const targetPoint = activeRoute.puntos[0];
          const latDiff = (targetPoint.lat - prev[0]) * 0.001;
          const lngDiff = (targetPoint.lng - prev[1]) * 0.001;
          
          const newLat = prev[0] + latDiff;
          const newLng = prev[1] + lngDiff;
          
          return [newLat, newLng];
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeRoute, isUsingGeolocation]);

  useEffect(() => {
    if (!activeRoute?.vehiculoId || !effectiveCurrentLocation) return;
    if (locationSendCooldownRef.current) return;
    locationSendCooldownRef.current = true;
    window.setTimeout(() => {
      locationSendCooldownRef.current = false;
    }, 20000);
    if (user?.role !== "chofer") {
      void updateVehicleLocation(activeRoute.vehiculoId, {
        lat: effectiveCurrentLocation[0],
        lng: effectiveCurrentLocation[1],
      });
    }
    if (activeRoute.estado === "en_progreso") {
      void registerRoutePosition(activeRoute.id, {
        lat: effectiveCurrentLocation[0],
        lng: effectiveCurrentLocation[1],
      }, { recordedAt: new Date().toISOString() });
    }
  }, [
    activeRoute?.vehiculoId,
    activeRoute?.estado,
    activeRoute?.id,
    effectiveCurrentLocation,
    registerRoutePosition,
    updateVehicleLocation,
    user?.role,
  ]);

  const handleStartRoute = async () => {
    if (activeRoute && activeRoute.estado === "pendiente") {
      const result = await updateRoute(activeRoute.id, {
        estado: "en_progreso",
        fechaInicio: new Date().toISOString(),
      });
      if (result.ok) {
        toast.success(result.message ?? "Ruta iniciada");
      } else {
        toast.error(result.message ?? "No se pudo iniciar la ruta");
      }
    }
  };

  const handlePauseRoute = async () => {
    if (activeRoute && activeRoute.estado === "en_progreso") {
      const result = await updateRoute(activeRoute.id, {
        estado: "pendiente",
      });
      if (result.ok) {
        toast.success(result.message ?? "Ruta pausada");
      } else {
        toast.error(result.message ?? "No se pudo pausar la ruta");
      }
    }
  };

  const handleCompleteRoute = async () => {
    if (activeRoute) {
      if (!activeRoute.evidencias || activeRoute.evidencias.length === 0) {
        toast.error("Por favor adjunta al menos una evidencia antes de completar la ruta");
        return;
      }

      const result = await updateRoute(activeRoute.id, {
        estado: "completada",
        fechaFin: new Date().toISOString(),
      });
      if (result.ok) {
        toast.success(result.message ?? "Ruta completada exitosamente");
      } else {
        toast.error(result.message ?? "No se pudo completar la ruta");
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (activeRoute && reader.result) {
        addRouteEvidence(activeRoute.id, {
          type: "image",
          content: reader.result as string,
          description: evidenceDescription,
        });
        toast.success("Imagen adjuntada exitosamente");
        setShowEvidenceDialog(false);
        setEvidenceDescription("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddNote = () => {
    if (!evidenceNote.trim()) {
      toast.error("Por favor escribe una nota");
      return;
    }

    if (activeRoute) {
      addRouteEvidence(activeRoute.id, {
        type: "note",
        content: evidenceNote,
      });
      toast.success("Nota agregada exitosamente");
      setShowEvidenceDialog(false);
      setEvidenceNote("");
    }
  };

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle || null;
  };

  if (user && !driverId && drivers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-4">
        <p className="text-sm text-gray-500">Cargando ruta asignada...</p>
      </div>
    );
  }

  if (!activeRoute) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Navigation size={40} className="text-gray-400" />
          </div>
          <h2 className="text-xl text-gray-900 mb-2">No tienes rutas asignadas</h2>
          <p className="text-sm text-gray-500">
            Cuando se te asigne una ruta, aparecerá aquí para que puedas comenzar tu entrega.
          </p>

          {myRoutes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base text-gray-900 mb-3">Rutas Completadas</h3>
              <div className="space-y-2">
                {myRoutes
                  .filter(r => r.estado === "completada")
                  .slice(0, 5)
                  .map((route) => (
                    <div
                      key={route.id}
                      className="p-3 bg-green-50 border border-green-200 rounded-lg text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={14} className="text-green-600" />
                        <p className="text-sm text-gray-900">{route.nombre}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Completada el {route.fechaFin ? new Date(route.fechaFin).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const vehicle = getVehicleInfo(activeRoute.vehiculoId);
  const nextPoint =
    activeRoute.puntos[0] ?? activeRoute.destino ?? activeRoute.origen ?? null;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
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
              <h2 className="text-xl md:text-2xl text-gray-900">Mi Ruta Activa</h2>
              <p className="text-sm text-gray-500 mt-1">{activeRoute.nombre}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1.5 rounded-lg text-xs ${
              activeRoute.estado === "en_progreso"
                ? "bg-blue-100 text-blue-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {activeRoute.estado === "en_progreso" ? "En Curso" : "Pendiente"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="relative h-[300px] md:h-[400px] bg-gray-100">
          <DriverRouteMap
            currentLocation={effectiveCurrentLocation}
            origin={activeRoute.origen}
            stops={activeRoute.puntos}
            destination={activeRoute.destino}
          />

          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 z-10">
            <Compass size={16} className="text-[#3271a4] animate-pulse" />
            <span className="text-xs text-gray-700">GPS Activo</span>
          </div>

          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
            <p className="text-xs text-gray-500">Siguiente punto</p>
            <p className="text-sm text-gray-900">
              {nextPoint?.nombre || "No disponible"}
            </p>
          </div>

          {effectiveCurrentLocation && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-[#3271a4]" />
                <span className="text-xs text-gray-700">{vehicle?.placa || "Vehículo"}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-base text-gray-900 mb-3">Vehículo Asignado</h3>
            {vehicle && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Navigation size={24} className="text-[#3271a4]" />
                </div>
                <div>
                  <p className="text-base text-gray-900">{vehicle.placa}</p>
                  <p className="text-sm text-gray-500">
                    {vehicle.marca} {vehicle.modelo} ({vehicle.anio})
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package size={20} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base text-gray-900 mb-2">Carga</h3>
              <p className="text-sm text-gray-600">{activeRoute.carga}</p>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <h3 className="text-base text-gray-900 mb-4">Puntos de Entrega</h3>
          <div className="space-y-3">
            {activeRoute.puntos.map((punto, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="w-8 h-8 bg-[#3271a4] text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{punto.nombre}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {punto.lat.toFixed(4)}, {punto.lng.toFixed(4)}
                  </p>
                </div>
                <MapPin size={18} className="text-gray-400" />
              </div>
            ))}
          </div>
        </div>

        {activeRoute.estado === "en_progreso" && (
          <div className="p-4 md:p-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base text-gray-900">Evidencias</h3>
              <button
                onClick={() => setShowEvidenceDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm"
              >
                <Upload size={14} />
                Adjuntar
              </button>
            </div>

            {activeRoute.evidencias && activeRoute.evidencias.length > 0 ? (
              <div className="space-y-2">
                {activeRoute.evidencias.map((evidencia) => (
                  <div key={evidencia.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {evidencia.type === "image" ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Camera size={14} className="text-gray-600" />
                          <span className="text-xs text-gray-600">Foto</span>
                        </div>
                        <img
                          src={evidencia.content}
                          alt="Evidencia"
                          className="w-full rounded mb-1"
                        />
                        {evidencia.description && (
                          <p className="text-xs text-gray-600 mt-1">{evidencia.description}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={14} className="text-gray-600" />
                          <span className="text-xs text-gray-600">Nota</span>
                        </div>
                        <p className="text-sm text-gray-900">{evidencia.content}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(evidencia.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 text-center">
                  Adjunta evidencias antes de completar la ruta
                </p>
              </div>
            )}
          </div>
        )}

        <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50">
          {activeRoute.estado === "pendiente" && (
            <button
              onClick={handleStartRoute}
              className="w-full py-3 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors flex items-center justify-center gap-2"
            >
              <Play size={18} />
              Iniciar Ruta
            </button>
          )}

          {activeRoute.estado === "en_progreso" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 text-center">
                  <strong>Ruta en progreso</strong> - Completa todas las entregas
                </p>
                {activeRoute.fechaInicio && (
                  <p className="text-xs text-blue-700 text-center mt-1">
                    Iniciada el {new Date(activeRoute.fechaInicio).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePauseRoute}
                  className="py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Pause size={16} />
                  Pausar
                </button>
                <button
                  onClick={handleCompleteRoute}
                  className="py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle size={16} />
                  Completar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showEvidenceDialog} onOpenChange={() => setShowEvidenceDialog(false)}>
        <DialogContent className="sm:max-w-md max-w-[90%]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Adjuntar Evidencia</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEvidenceType("image")}
                className={`p-3 rounded-lg border-2 transition-all ${
                  evidenceType === "image"
                    ? "border-[#3271a4] bg-[#3271a4] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <Camera size={20} className="mx-auto mb-1" />
                <span className="text-xs">Foto</span>
              </button>
              <button
                onClick={() => setEvidenceType("note")}
                className={`p-3 rounded-lg border-2 transition-all ${
                  evidenceType === "note"
                    ? "border-[#3271a4] bg-[#3271a4] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <FileText size={20} className="mx-auto mb-1" />
                <span className="text-xs">Nota</span>
              </button>
            </div>

            {evidenceType === "image" ? (
              <div>
                <label className="block text-sm text-gray-700 mb-2">Descripción (opcional)</label>
                <input
                  type="text"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3271a4] focus:border-transparent text-sm mb-3"
                  placeholder="Ej: Entrega en puerta principal"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#3271a4] file:text-white hover:file:bg-[#2a5f8c] file:cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Selecciona una foto desde tu dispositivo
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-700 mb-2">Nota</label>
                <textarea
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3271a4] focus:border-transparent text-sm resize-none"
                  rows={4}
                  placeholder="Escribe tu nota aquí..."
                />
                <button
                  onClick={handleAddNote}
                  className="w-full mt-3 px-4 py-2 bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors text-sm"
                >
                  Agregar Nota
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setShowEvidenceDialog(false);
                setEvidenceNote("");
                setEvidenceDescription("");
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
