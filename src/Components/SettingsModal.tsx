"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { useAuth } from "../Context/AuthContext";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { Trash2, User, Lock, Shield } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  const handleDeleteAccount = async () => {
    await logout();
    toast.info("La eliminacion de cuentas se realiza desde el backend. Hemos cerrado tu sesion.");
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleChangePassword = () => {
    toast.info("Esta funcionalidad estará disponible próximamente");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Configuración de cuenta</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Administra tu cuenta y preferencias
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-3 md:gap-4 border-b border-gray-200 mb-4">
            {["profile", "security"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "profile" | "security")}
                className={`pb-2 px-1 transition-colors text-sm md:text-base ${
                  activeTab === tab
                    ? "border-b-2 border-[#3271a4] text-[#3271a4]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  {tab === "profile" ? <User size={14} /> : <Shield size={14} />}
                  {tab === "profile" ? "Perfil" : "Seguridad"}
                </div>
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-5 md:space-y-6">
              <div>
                <h4 className="mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                  <User size={16} />
                  Información personal
                </h4>
                <div className="space-y-3 bg-gray-50 p-3 md:p-4 rounded-lg">
                  <InfoRow label="Nombres" value={user?.nombres} />
                  <InfoRow label="Apellidos" value={user?.apellidos} />
                  <InfoRow label="Usuario" value={`@${user?.usuario}`} />
                  <InfoRow label="ID de cuenta" value={user?.id} valueClass="text-xs text-gray-400 break-all" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="mb-2 text-red-600 flex items-center gap-2 text-base md:text-lg">
                  <Trash2 size={16} />
                  Zona de peligro
                </h4>
                <p className="text-xs md:text-sm text-gray-500 mb-4">
                  Una vez que elimines tu cuenta, no podrás recuperarla. Por favor, ten cuidado.
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

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-5 md:space-y-6">
              <h4 className="mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                <Lock size={16} />
                Seguridad de la cuenta
              </h4>
              <div className="space-y-3 md:space-y-4">
                <SecurityCard
                  title="Contraseña"
                  description="Actualiza tu contraseña para mantener tu cuenta segura"
                  onClick={handleChangePassword}
                />
                <SecurityCard
                  title="Sesiones activas"
                  description="Actualmente estás conectado en este dispositivo"
                  active
                />
              </div>
            </div>
          )}

          {/* Cerrar modal */}
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

      {/* Confirmación eliminar cuenta */}
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

// Componentes auxiliares
function InfoRow({ label, value, valueClass }: { label: string; value?: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs md:text-sm text-gray-500">{label}</p>
      <p className={`text-sm md:text-base break-words ${valueClass || ""}`}>{value}</p>
    </div>
  );
}

function SecurityCard({
  title,
  description,
  onClick,
  active,
}: {
  title: string;
  description: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
      <p className="mb-2 text-sm md:text-base">{title}</p>
      <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">{description}</p>
      {onClick && (
        <button
          onClick={onClick}
          className={`px-3 md:px-4 py-2 text-sm md:text-base rounded-lg transition-colors ${
            active ? "bg-green-500 text-white cursor-default" : "bg-[#3271a4] text-white hover:bg-[#2a5f8c]"
          }`}
          disabled={active}
        >
          {active ? "Sesión activa" : "Cambiar contraseña"}
        </button>
      )}
    </div>
  );
}
