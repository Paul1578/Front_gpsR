"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Trash2, User, Lock, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  const handleDeleteAccount = () => {
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const updatedUsers = users.filter((u: any) => u.id !== user?.id);
      localStorage.setItem("users", JSON.stringify(updatedUsers));

      logout();
      toast.success("Cuenta eliminada exitosamente");
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar la cuenta");
    }
  };

  const handleChangePassword = () => {
    toast.info("Esta funcionalidad estará disponible próximamente");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Configuración de cuenta
            </DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Administra tu cuenta y preferencias
            </DialogDescription>
          </DialogHeader>

          {/* Pestañas */}
          <div className="flex gap-3 md:gap-4 border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-2 px-1 transition-colors text-sm md:text-base ${
                activeTab === "profile"
                  ? "border-b-2 border-[#3271a4] text-[#3271a4]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <User size={14} className="md:w-4 md:h-4" />
                Perfil
              </div>
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`pb-2 px-1 transition-colors text-sm md:text-base ${
                activeTab === "security"
                  ? "border-b-2 border-[#3271a4] text-[#3271a4]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <Shield size={14} className="md:w-4 md:h-4" />
                Seguridad
              </div>
            </button>
          </div>

          {/* Perfil */}
          {activeTab === "profile" && (
            <div className="space-y-5 md:space-y-6">
              <div>
                <h4 className="mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                  <User size={16} className="md:w-[18px] md:h-[18px]" />
                  Información personal
                </h4>
                <div className="space-y-3 bg-gray-50 p-3 md:p-4 rounded-lg">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Nombres</p>
                    <p className="text-sm md:text-base break-words">
                      {user?.nombres}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Apellidos</p>
                    <p className="text-sm md:text-base break-words">
                      {user?.apellidos}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Usuario</p>
                    <p className="text-sm md:text-base break-words">
                      @{user?.usuario}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">
                      ID de cuenta
                    </p>
                    <p className="text-xs text-gray-400 break-all">{user?.id}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="mb-2 text-red-600 flex items-center gap-2 text-base md:text-lg">
                  <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                  Zona de peligro
                </h4>
                <p className="text-xs md:text-sm text-gray-500 mb-4">
                  Una vez que elimines tu cuenta, no podrás recuperarla. Por
                  favor, ten cuidado.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 md:px-4 py-2 text-sm md:text-base bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Eliminar cuenta
                </button>
              </div>
            </div>
          )}

          {/* Seguridad */}
          {activeTab === "security" && (
            <div className="space-y-5 md:space-y-6">
              <div>
                <h4 className="mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                  <Lock size={16} className="md:w-[18px] md:h-[18px]" />
                  Seguridad de la cuenta
                </h4>
                <div className="space-y-3 md:space-y-4">
                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <p className="mb-2 text-sm md:text-base">Contraseña</p>
                    <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
                      Actualiza tu contraseña para mantener tu cuenta segura
                    </p>
                    <button
                      onClick={handleChangePassword}
                      className="px-3 md:px-4 py-2 text-sm md:text-base bg-[#3271a4] text-white rounded-lg hover:bg-[#2a5f8c] transition-colors"
                    >
                      Cambiar contraseña
                    </button>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <p className="mb-2 text-sm md:text-base">Sesiones activas</p>
                    <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
                      Actualmente estás conectado en este dispositivo
                    </p>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Sesión activa
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cerrar */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="¿Estás seguro?"
        description="Esta acción eliminará permanentemente tu cuenta y todos los datos asociados. Esta acción no se puede deshacer."
        confirmText="Sí, eliminar mi cuenta"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}
