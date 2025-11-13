"use client";

import { useState, useRef, useEffect } from "react";
import { useFleet, RouteEvidence } from "@/context/FleetContext";
import { useAuth } from "@/context/AuthContext";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface DriverViewProps {
  onBack?: () => void;
}

interface MapViewerProps {
  currentLocation: [number, number] | null;
  routePoints: Array<{ lat: number; lng: number; nombre: string }>;
  vehiclePlate?: string;
}

function MapViewer({ currentLocation, routePoints, vehiclePlate }: MapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let i = 0; i < rect.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, rect.height);
      ctx.stroke();
    }
    for (let i = 0; i < rect.height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(rect.width, i);
      ctx.stroke();
    }

    const allPoints = [...routePoints];
    if (currentLocation) {
      allPoints.push({ lat: currentLocation[0], lng: currentLocation[1], nombre: "Current" });
    }

    if (allPoints.length === 0) return;

    const minLat = Math.min(...allPoints.map((p) => p.lat));
    const maxLat = Math.max(...allPoints.map((p) => p.lat));
    const minLng = Math.min(...allPoints.map((p) => p.lng));
    const maxLng = Math.max(...allPoints.map((p) => p.lng));

    const padding = 60;
    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;

    const toX = (lng: number) => ((lng - minLng) / lngRange) * (rect.width - padding * 2) + padding;
    const toY = (lat: number) =>
      rect.height - (((lat - minLat) / latRange) * (rect.height - padding * 2) + padding);

    // Draw route line
    if (routePoints.length > 1) {
      ctx.strokeStyle = "#3271a4";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(toX(routePoints[0].lng), toY(routePoints[0].lat));
      routePoints.forEach((point, i) => {
        if (i > 0) {
          ctx.lineTo(toX(point.lng), toY(point.lat));
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw points
    routePoints.forEach((point, index) => {
      const x = toX(point.lng);
      const y = toY(point.lat);

      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((index + 1).toString(), x, y);
    });

    // Draw current location
    if (currentLocation) {
      const x = toX(currentLocation[1]);
      const y = toY(currentLocation[0]);
      ctx.fillStyle = "rgba(50, 113, 164, 0.2)";
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3271a4";
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x - 5, y + 4);
      ctx.lineTo(x + 5, y + 4);
      ctx.closePath();
      ctx.fill();
    }
  }, [currentLocation, routePoints, vehiclePlate]);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-gray-100">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

export default function DriverPage() {
  return <DriverView />;
}

function DriverView({ onBack }: DriverViewProps = {}) {
  // Aquí va el mismo contenido del componente que ya me pasaste.
  // No cambian los hooks ni la lógica, solo los imports.
}
