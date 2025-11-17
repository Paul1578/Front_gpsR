import { useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import { ArrowLeft, User, Mail, IdCard, Shield, Calendar, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ProfileViewProps {
  onBack?: () => void;
}

export function ProfileView({ onBack }: ProfileViewProps = {}) {
  const { user, updateTeamName } = useAuth();
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [tempTeamName, setTempTeamName] = useState("");

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No hay usuario autenticado</p>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      superadmin: "Super Admin",
      gerente: "Gerente",
      logistica: "Logística",
      chofer: "Chofer",
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      superadmin: "text-red-700 bg-red-100",
      gerente: "text-purple-700 bg-purple-100",
      logistica: "text-blue-700 bg-blue-100",
      chofer: "text-green-700 bg-green-100",
    };
    return colors[role as keyof typeof colors] || "text-gray-700 bg-gray-100";
  };

  const permissionLabels = {
    canViewMap: "Ver Mapa en Tiempo Real",
    canCreateRoutes: "Crear y Gestionar Rutas",
    canManageVehicles: "Gestionar Vehículos",
    canManageTeam: "Gestionar Equipo",
    canViewOwnRoute: "Ver Mi Ruta",
    canAccessSuperAdmin: "Acceso a Panel Super Admin",
    canManageAllOrganizations: "Gestionar Todas las Organizaciones",
    canViewSystemLogs: "Ver Logs del Sistema",
    canExportData: "Exportar Datos del Sistema",
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-2xl text-gray-900">Mi Perfil</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          Información de tu cuenta y permisos
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header with avatar */}
        <div className="bg-gradient-to-r from-[#3271a4] to-[#4384d8] p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
              <User size={40} className="text-[#3271a4]" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl text-white">
                {user.nombres} {user.apellidos}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-3 py-1 rounded-full text-xs ${getRoleColor(
                    user.role
                  )}`}
                >
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="p-6 space-y-4">
          {/* Identification */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <IdCard size={20} className="text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">
                Número de Identificación
              </p>
              <p className="text-sm text-gray-900">{user.identificacion || "No asignado"}</p>
            </div>
          </div>

          {/* Username */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <User size={20} className="text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Nombre de Usuario</p>
              <p className="text-sm text-gray-900">{user.usuario}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Shield size={20} className="text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Rol en el Sistema</p>
              <p className="text-sm text-gray-900 capitalize">
                {getRoleLabel(user.role)}
              </p>
            </div>
          </div>

          {/* Team Name - Solo para Gerentes */}
          {user.role === "gerente" && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Shield size={20} className="text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-blue-600 mb-1">Nombre de tu Equipo</p>
                {editingTeamName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempTeamName}
                      onChange={(e) => setTempTeamName(e.target.value)}
                      className="flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                      placeholder="Nombre del equipo"
                    />
                    <button
                      onClick={() => {
                        updateTeamName(tempTeamName);
                        setEditingTeamName(false);
                        toast.success("Nombre del equipo actualizado");
                      }}
                      className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => setEditingTeamName(false)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-blue-900">
                      {user.teamName || `Equipo de ${user.nombres}`}
                    </p>
                    <button
                      onClick={() => {
                        setTempTeamName(user.teamName || `Equipo de ${user.nombres}`);
                        setEditingTeamName(true);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-gray-400" />
              <h3 className="text-sm text-gray-900">Permisos Asignados</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(user.permissions).map(([key, value]) => (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    value ? "bg-green-50" : "bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      value ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    {value && <span className="text-white text-xs">✓</span>}
                  </div>
                  <p
                    className={`text-sm ${
                      value ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {
                      permissionLabels[
                        key as keyof typeof permissionLabels
                      ]
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Para cambiar tu información personal o permisos, contacta a un administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
