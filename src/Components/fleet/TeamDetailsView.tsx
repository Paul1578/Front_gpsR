import { useState } from "react";
import { ArrowLeft, Users, Truck, Route, History, Edit2, Check, X } from "lucide-react";
import { useAuth } from "../../Context/AuthContext";
import { useFleet } from "../../Context/FleetContext";
import { toast } from "sonner";

interface TeamDetailsViewProps {
  teamId: string;
  onBack: () => void;
}

export function TeamDetailsView({ teamId, onBack }: TeamDetailsViewProps) {
  const { getAllUsers, updateUserRole, updateUserPermissions } = useAuth();
  const { vehicles, routes } = useFleet();
  const [activeTab, setActiveTab] = useState<"team" | "vehicles" | "routes" | "history">("team");
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [tempTeamName, setTempTeamName] = useState("");

  // Obtener datos del sistema
  const allUsers = getAllUsers();
  const manager = allUsers.find(u => u.id === teamId);
  const teamMembers = allUsers.filter(u => u.teamId === teamId);
  
  const allVehicles = vehicles;
  const teamVehicles = allVehicles.filter((v: any) => v.teamId === teamId);
  
  const allRoutes = routes;
  const teamRoutes = allRoutes.filter((r: any) => r.teamId === teamId);
  const activeRoutes = teamRoutes.filter((r: any) => r.estado === "en_progreso");
  const completedRoutes = teamRoutes.filter((r: any) => r.estado === "completada");

  if (!manager) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">Equipo no encontrado</p>
      </div>
    );
  }

  const handleEditTeamName = () => {
    setTempTeamName(manager.teamName || `Equipo de ${manager.nombres}`);
    setEditingTeamName(true);
  };

  const handleSaveTeamName = () => {
    toast.info("Actualiza el nombre del equipo desde el backend");
    setEditingTeamName(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "gerente": return "bg-blue-100 text-blue-800";
      case "logistica": return "bg-purple-100 text-purple-800";
      case "chofer": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "gerente": return "Gerente";
      case "logistica": return "Logística";
      case "chofer": return "Chofer";
      default: return role;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              {editingTeamName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempTeamName}
                    onChange={(e) => setTempTeamName(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    placeholder="Nombre del equipo"
                  />
                  <button
                    onClick={handleSaveTeamName}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setEditingTeamName(false)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl text-gray-900">
                    {manager.teamName || `Equipo de ${manager.nombres} ${manager.apellidos}`}
                  </h1>
                  <button
                    onClick={handleEditTeamName}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-600">
                Gerente: {manager.nombres} {manager.apellidos} (@{manager.usuario})
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-blue-600" />
                <p className="text-xs text-blue-800">Miembros</p>
              </div>
              <p className="text-xl text-blue-900">{teamMembers.length + 1}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Truck size={16} className="text-green-600" />
                <p className="text-xs text-green-800">Vehículos</p>
              </div>
              <p className="text-xl text-green-900">{teamVehicles.length}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Route size={16} className="text-purple-600" />
                <p className="text-xs text-purple-800">Rutas Activas</p>
              </div>
              <p className="text-xl text-purple-900">{activeRoutes.length}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <History size={16} className="text-orange-600" />
                <p className="text-xs text-orange-800">Completadas</p>
              </div>
              <p className="text-xl text-orange-900">{completedRoutes.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab("team")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "team"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users size={18} />
              Equipo
            </button>
            <button
              onClick={() => setActiveTab("vehicles")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "vehicles"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Truck size={18} />
              Vehículos
            </button>
            <button
              onClick={() => setActiveTab("routes")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "routes"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Route size={18} />
              Rutas Activas
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "history"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <History size={18} />
              Historial
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto">
          {activeTab === "team" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-lg text-gray-900 mb-4">Gerente</h3>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white">
                      {manager.nombres.charAt(0)}
                      {manager.apellidos.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {manager.nombres} {manager.apellidos}
                      </p>
                      <p className="text-xs text-gray-600">
                        @{manager.usuario} · ID: {manager.identificacion}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                      Gerente
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-lg text-gray-900 mb-4">
                  Miembros del Equipo ({teamMembers.length})
                </h3>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Este equipo no tiene miembros aún
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center text-white text-sm">
                            {member.nombres.charAt(0)}
                            {member.apellidos.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">
                              {member.nombres} {member.apellidos}
                            </p>
                            <p className="text-xs text-gray-500">
                              @{member.usuario} · ID: {member.identificacion}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs whitespace-nowrap ${getRoleColor(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "vehicles" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg text-gray-900 mb-4">
                Vehículos del Equipo ({teamVehicles.length})
              </h3>
              {teamVehicles.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Este equipo no tiene vehículos registrados
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamVehicles.map((vehicle: any) => (
                    <div key={vehicle.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <Truck size={24} className="text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{vehicle.placa}</p>
                          <p className="text-xs text-gray-600">
                            {vehicle.marca} {vehicle.modelo} ({vehicle.año})
                          </p>
                          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                            vehicle.estado === "disponible" ? "bg-green-100 text-green-800" :
                            vehicle.estado === "en_ruta" ? "bg-blue-100 text-blue-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {vehicle.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "routes" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg text-gray-900 mb-4">
                Rutas Activas ({activeRoutes.length})
              </h3>
              {activeRoutes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay rutas activas
                </p>
              ) : (
                <div className="space-y-3">
                  {activeRoutes.map((route: any) => {
                    const driver = allUsers.find(u => u.id === route.conductorId);
                    const vehicle = allVehicles.find((v: any) => v.id === route.vehiculoId);
                    
                    return (
                      <div key={route.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm text-gray-900">{route.nombre}</p>
                            <p className="text-xs text-gray-600">
                              Conductor: {driver?.nombres} {driver?.apellidos}
                            </p>
                            <p className="text-xs text-gray-600">
                              Vehículo: {vehicle?.placa}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            {route.estado}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Carga: {route.carga}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg text-gray-900 mb-4">
                Historial de Rutas ({completedRoutes.length})
              </h3>
              {completedRoutes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay rutas completadas
                </p>
              ) : (
                <div className="space-y-3">
                  {completedRoutes.map((route: any) => {
                    const driver = allUsers.find(u => u.id === route.conductorId);
                    const vehicle = allVehicles.find((v: any) => v.id === route.vehiculoId);
                    
                    return (
                      <div key={route.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm text-gray-900">{route.nombre}</p>
                            <p className="text-xs text-gray-600">
                              Conductor: {driver?.nombres} {driver?.apellidos}
                            </p>
                            <p className="text-xs text-gray-600">
                              Vehículo: {vehicle?.placa}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                            Completada
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Carga: {route.carga}
                        </p>
                        {route.fechaFin && (
                          <p className="text-xs text-gray-400 mt-1">
                            Completada: {new Date(route.fechaFin).toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
