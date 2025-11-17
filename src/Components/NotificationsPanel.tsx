"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Bell, Check, Info, AlertCircle } from "lucide-react";

interface Notification {
  id: string;
  type: "info" | "success" | "warning";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

const mockNotifications: Notification[] = [
  { id: "1", type: "success", title: "Bienvenido", message: "Tu cuenta ha sido creada exitosamente", time: "Hace 5 minutos", read: false },
  { id: "2", type: "info", title: "Actualización disponible", message: "Hay nuevas características disponibles en la plataforma", time: "Hace 1 hora", read: false },
  { id: "3", type: "warning", title: "Recordatorio", message: "Revisa tu configuración de seguridad", time: "Hace 2 horas", read: true },
];

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success": return <Check className="text-green-600" size={20} />;
      case "warning": return <AlertCircle className="text-orange-600" size={20} />;
      default: return <Info className="text-blue-600" size={20} />;
    }
  };

  const getBackgroundColor = (type: Notification["type"]) => {
    switch (type) {
      case "success": return "bg-green-100";
      case "warning": return "bg-orange-100";
      default: return "bg-blue-100";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-lg md:text-xl">Notificaciones</SheetTitle>
          <SheetDescription className="text-sm md:text-base">
            Mantente al día con tus actividades y actualizaciones
          </SheetDescription>
        </SheetHeader>

        {/* Lista de notificaciones */}
        <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
          {mockNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 md:p-4 rounded-lg border ${n.read ? "bg-gray-50" : "bg-white border-[#3271a4]/20"}`}
            >
              <div className="flex gap-2.5 md:gap-3">
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full ${getBackgroundColor(n.type)} flex items-center justify-center flex-shrink-0`}>
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-gray-900 text-sm md:text-base pr-2">{n.title}</h4>
                    {!n.read && <div className="w-2 h-2 bg-[#3271a4] rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 mb-2">{n.message}</p>
                  <p className="text-xs text-gray-400">{n.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Estado vacío */}
        {mockNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Bell className="text-gray-400" size={28} />
            </div>
            <p className="text-gray-500 text-sm md:text-base">No tienes notificaciones nuevas</p>
          </div>
        )}

        {/* Acción de marcar todas como leídas */}
        <div className="mt-4 md:mt-6 pt-4 border-t border-gray-200">
          <button className="w-full py-2 text-center text-[#3271a4] hover:underline text-xs md:text-sm">
            Marcar todas como leídas
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
