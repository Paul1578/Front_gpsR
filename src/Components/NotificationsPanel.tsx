"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Bell } from "lucide-react";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-lg md:text-xl">Notificaciones</SheetTitle>
          <SheetDescription className="text-sm md:text-base">
            Mantente al día con tus actividades y actualizaciones
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Bell className="text-gray-400" size={28} />
          </div>
          <p className="text-gray-500 text-sm md:text-base">No hay notificaciones disponibles</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
