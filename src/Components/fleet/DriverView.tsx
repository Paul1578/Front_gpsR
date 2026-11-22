import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useFleet } from "../../Context/FleetContext";
import { useAuth } from "../../Context/AuthContext";
import {
  MapPin,
  Package,
  Navigation,
  CheckCircle,
  ArrowLeft,
  Camera,
  FileText,
  Upload,
  Play,
  Pause,
  Compass,
  Truck,
} from "lucide-react";
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
    routesLoading,
    loadErrors,
    vehicles,
    drivers,
    refreshDrivers,
    updateRoute,
    updateRoutePointStatus,
    addRoutePointEvidence,
    registerRoutePosition,
    retryFleetData,
  } = useFleet();
  const { user } = useAuth();
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [evidenceType, setEvidenceType] = useState<"image" | "note">("image");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [selectedEvidencePointIndex, setSelectedEvidencePointIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentLocation, setCurrentLocation] = useState<
    [number, number] | null
  >(null);
  const lastLocationSentRef = useRef(0);
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
  const activeRoute =
    myRoutes.find((r) => r.estado === "en_progreso") ??
    myRoutes.find((r) => r.estado === "pendiente");
  const operationalStops = activeRoute
    ? [
        ...(activeRoute.origen ? [{ pointIndex: 0, point: activeRoute.origen }] : []),
        ...activeRoute.puntos.map((point, index) => ({ pointIndex: index + 1, point })),
        ...(activeRoute.destino
          ? [{ pointIndex: activeRoute.puntos.length + 1, point: activeRoute.destino }]
          : []),
      ].filter(({ point }) => point.operation && point.operation !== "none")
    : [];

  useEffect(() => {
    if (!activeRoute) {
      setCurrentLocation(null);
      return;
    }

    const vehicle = vehicles.find((v) => v.id === activeRoute.vehiculoId);
    const savedLocation = vehicle?.ubicacionActual;
    setCurrentLocation(
      savedLocation ? [savedLocation.lat, savedLocation.lng] : null,
    );
  }, [activeRoute, vehicles]);

  useEffect(() => {
    if (!activeRoute) return;
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setIsUsingGeolocation(true);
        setCurrentLocation([
          position.coords.latitude,
          position.coords.longitude,
        ]);
      },
      () => {
        setIsUsingGeolocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(id);
      setIsUsingGeolocation(false);
    };
  }, [activeRoute]);

  useEffect(() => {
    if (
      !activeRoute?.vehiculoId ||
      activeRoute.estado !== "en_progreso" ||
      !currentLocation ||
      !isUsingGeolocation
    )
      return;
    // This timestamp is intentionally sampled when the location side effect runs.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    if (now - lastLocationSentRef.current < 20000) return;
    lastLocationSentRef.current = now;
    void registerRoutePosition(
      activeRoute.id,
      {
        lat: currentLocation[0],
        lng: currentLocation[1],
      },
      { recordedAt: new Date().toISOString() },
    );
  }, [
    activeRoute,
    currentLocation,
    registerRoutePosition,
    user?.role,
    isUsingGeolocation,
  ]);

  const handleStartRoute = async () => {
    if (activeRoute && activeRoute.estado === "pendiente") {
      const result = await updateRoute(activeRoute.id, {
        estado: "en_progreso",
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
      const hasPendingStops = operationalStops.some(
        ({ point }) =>
          !["completed", "skipped"].includes(point.status ?? "pending") ||
          !point.evidence?.length,
      );
      if (hasPendingStops) {
        toast.error(
          "Completa cada parada operativa y adjunta al menos una evidencia",
        );
        return;
      }

      const result = await updateRoute(activeRoute.id, {
        estado: "completada",
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
    if (selectedEvidencePointIndex === null || selectedEvidencePointIndex < 0) {
      toast.error("Selecciona una parada antes de adjuntar evidencia");
      return;
    }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      toast.error("Usa una imagen JPEG, PNG o WebP");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("La imagen debe pesar 4 MB o menos");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (activeRoute && typeof reader.result === "string") {
        const result = await addRoutePointEvidence(
          activeRoute.id,
          selectedEvidencePointIndex,
          {
          type: "image",
          content: reader.result,
          description: evidenceDescription,
          },
        );
        if (result.ok) {
          toast.success("Evidencia guardada en la parada");
          setShowEvidenceDialog(false);
          setEvidenceDescription("");
        } else {
          toast.error(result.message ?? "No se pudo guardar la evidencia");
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddNote = async () => {
    if (!evidenceNote.trim()) {
      toast.error("Por favor escribe una nota");
      return;
    }

    if (activeRoute && selectedEvidencePointIndex !== null) {
      const result = await addRoutePointEvidence(activeRoute.id, selectedEvidencePointIndex, {
        type: "note",
        content: evidenceNote,
      });
      if (result.ok) {
        toast.success("Nota guardada en la parada");
        setShowEvidenceDialog(false);
        setEvidenceNote("");
      } else {
        toast.error(result.message ?? "No se pudo guardar la nota");
      }
    }
  };

  const handleStopStatus = async (
    pointIndex: number,
    status: "in_progress" | "completed" | "failed" | "skipped",
  ) => {
    if (!activeRoute) return;
    const result = await updateRoutePointStatus(activeRoute.id, pointIndex, status);
    if (result.ok) toast.success("Estado de parada actualizado");
    else toast.error(result.message ?? "No se pudo actualizar la parada");
  };

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle || null;
  };

  if (user && !driverId && drivers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-4">
        <p className="text-sm text-gray-500">Cargando ruta asignada...</p>
      </div>
    );
  }

  if (!activeRoute && routesLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-4">
        <p role="status" className="text-sm text-gray-500">Cargando tus rutas...</p>
      </div>
    );
  }

  if (!activeRoute && loadErrors.includes("rutas")) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-4">
        <div role="alert" className="max-w-md rounded-lg border border-red-200 bg-red-50 p-5 text-center text-sm text-red-800">
          <p>No se pudieron cargar tus rutas. No podemos confirmar si tienes una ruta asignada.</p>
          <button onClick={() => void retryFleetData()} className="mt-3 rounded-md bg-white px-3 py-2 font-semibold text-red-800">
            Reintentar
          </button>
        </div>
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
          <h2 className="text-xl text-gray-900 mb-2">
            No tienes rutas asignadas
          </h2>
          <p className="text-sm text-gray-500">
            Cuando se te asigne una ruta, aparecerá aquí para que puedas
            comenzar tu entrega.
          </p>

          {myRoutes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base text-gray-900 mb-3">
                Rutas Completadas
              </h3>
              <div className="space-y-2">
                {myRoutes
                  .filter((r) => r.estado === "completada")
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
                        Completada el{" "}
                        {route.fechaFinReal
                          ? new Date(route.fechaFinReal).toLocaleDateString()
                          : "N/A"}
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
  const nextPoint = operationalStops.find(
    ({ point }) => !["completed", "skipped"].includes(point.status ?? "pending"),
  )?.point ?? null;

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
              <h2 className="text-xl md:text-2xl text-gray-900">
                Mi Ruta Activa
              </h2>
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
        {loadErrors.includes("rutas") && (
          <div role="alert" className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span>No se pudo actualizar la lista de rutas. Se muestra la última información disponible.</span>
            <button onClick={() => void retryFleetData()} className="rounded-md bg-white px-3 py-1.5 font-semibold">Reintentar</button>
          </div>
        )}
        <div className="relative h-[300px] md:h-[400px] bg-gray-100">
          <DriverRouteMap
            currentLocation={currentLocation}
            origin={activeRoute.origen}
            stops={activeRoute.puntos}
            destination={activeRoute.destino}
          />

          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 z-10">
            <Compass
              size={16}
              className={
                isUsingGeolocation
                  ? "text-green-600 animate-pulse"
                  : "text-gray-500"
              }
            />
            <span className="text-xs text-gray-700">
              {isUsingGeolocation
                ? "GPS en vivo"
                : currentLocation
                  ? "Última ubicación registrada"
                  : "Sin ubicación GPS"}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
            <p className="text-xs text-gray-500">Siguiente punto</p>
            <p className="text-sm text-gray-900">
              {nextPoint?.nombre || "No hay paradas pendientes"}
            </p>
          </div>

          {currentLocation && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-[#3271a4]" />
                <span className="text-xs text-gray-700">
                  {vehicle?.placa || activeRoute.vehiculoPlaca || "Vehículo"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-base text-gray-900 mb-3">Vehículo Asignado</h3>
            {(vehicle || activeRoute.vehiculoPlaca) && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Navigation size={24} className="text-[#3271a4]" />
                </div>
                <div>
                  <p className="text-base text-gray-900">
                    {vehicle?.placa || activeRoute.vehiculoPlaca}
                  </p>
                  <p className="text-sm text-gray-500">
                    {vehicle
                      ? `${vehicle.marca} ${vehicle.modelo} (${vehicle.anio})`
                      : `${activeRoute.vehiculoMarca ?? ""} ${activeRoute.vehiculoModelo ?? ""}`.trim()}
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
          <h3 className="text-base text-gray-900 mb-4">Paradas operativas</h3>
          {operationalStops.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Esta ruta no tiene recogidas ni entregas registradas.
            </div>
          ) : (
            <div className="space-y-3">
              {operationalStops.map(({ point, pointIndex }, index) => {
                const operationLabel =
                  point.operation === "pickup_and_delivery"
                    ? "Recogida y entrega"
                    : point.operation === "pickup"
                      ? "Recogida"
                      : "Entrega";
                const statusLabel =
                  point.status === "in_progress"
                    ? "En curso"
                    : point.status === "completed"
                      ? "Completada"
                      : point.status === "failed"
                        ? "Fallida"
                        : point.status === "skipped"
                          ? "Omitida"
                          : "Pendiente";
                return (
                  <article key={pointIndex} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3271a4] text-sm text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{point.nombre || `Parada ${index + 1}`}</p>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{operationLabel}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{statusLabel}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</p>
                      </div>
                      <MapPin size={18} className="shrink-0 text-gray-400" />
                    </div>

                    {activeRoute.estado === "en_progreso" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(point.status === "pending" || point.status === "failed") && (
                          <button onClick={() => void handleStopStatus(pointIndex, "in_progress")} className="rounded-md bg-[#3271a4] px-3 py-1.5 text-xs text-white">
                            {point.status === "failed" ? "Reintentar" : "Iniciar parada"}
                          </button>
                        )}
                        {point.status === "in_progress" && (
                          <button
                            disabled={!point.evidence?.length}
                            onClick={() => void handleStopStatus(pointIndex, "completed")}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                            title={!point.evidence?.length ? "Adjunta evidencia para completar" : undefined}
                          >
                            Marcar completada
                          </button>
                        )}
                        {point.status === "pending" && (
                          <button
                            disabled={!point.evidence?.length}
                            onClick={() => void handleStopStatus(pointIndex, "skipped")}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                            title={!point.evidence?.length ? "Adjunta evidencia para omitir" : undefined}
                          >
                            Omitir
                          </button>
                        )}
                        {point.status !== "completed" && point.status !== "skipped" && (
                          <button
                            onClick={() => {
                              setSelectedEvidencePointIndex(pointIndex);
                              setShowEvidenceDialog(true);
                            }}
                            className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700"
                          >
                            <Upload size={13} /> Evidencia
                          </button>
                        )}
                      </div>
                    )}

                    {point.evidence && point.evidence.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                        {point.evidence.map((evidence) => (
                          <div key={evidence.id} className="rounded-md bg-gray-50 p-3">
                            {evidence.type === "image" ? (
                              <>
                                <div className="mb-2 flex items-center gap-2 text-xs text-gray-600"><Camera size={14} /> Foto</div>
                                <Image src={evidence.content} alt="Evidencia de la parada" width={960} height={640} unoptimized className="w-full rounded" />
                                {evidence.description && <p className="mt-1 text-xs text-gray-600">{evidence.description}</p>}
                              </>
                            ) : (
                              <div className="flex items-start gap-2 text-sm text-gray-800"><FileText size={14} className="mt-0.5 shrink-0" />{evidence.content}</div>
                            )}
                            <p className="mt-1 text-xs text-gray-400">{new Date(evidence.timestamp).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

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
                  <strong>Ruta en progreso</strong> - Completa todas las
                  entregas
                </p>
                {activeRoute.fechaInicioReal && (
                  <p className="text-xs text-blue-700 text-center mt-1">
                    Iniciada el{" "}
                    {new Date(activeRoute.fechaInicioReal).toLocaleString()}
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

      <Dialog
        open={showEvidenceDialog}
        onOpenChange={() => setShowEvidenceDialog(false)}
      >
        <DialogContent
          className="sm:max-w-md max-w-[90%]"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Adjuntar evidencia a parada
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              {operationalStops.find(({ pointIndex }) => pointIndex === selectedEvidencePointIndex)?.point.nombre ?? "Parada seleccionada"}
            </p>
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
                <label className="block text-sm text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
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
                  accept="image/jpeg,image/png,image/webp"
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
