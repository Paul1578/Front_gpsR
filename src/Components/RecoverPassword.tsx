"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface RecoverPasswordProps {
  className?: string;
  onBack: () => void;
}

export function RecoverPassword({ className, onBack }: RecoverPasswordProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Por favor ingresa tu correo");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/backend/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        toast.success((data && data.message) || "Si el email existe, se envio un token.");
        setEmail("");
        setTimeout(() => onBack(), 2500);
      } else {
        toast.error((data && data.message) || "No pudimos procesar tu solicitud. Intentalo nuevamente.");
      }
    } catch (err) {
      toast.error("Hubo un problema de conexion. Verifica tu red e intentalo otra vez.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-50 px-6 py-8 sm:px-8 sm:py-10 flex flex-col gap-6 ${className ?? ""}`}
      data-name="RecoverPassword"
    >
      <button
        onClick={onBack}
        className="flex items-center justify-center w-10 h-10 rounded-full text-[#3271a4] hover:bg-blue-50 transition-colors"
        type="button"
        aria-label="Volver"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Recuperemos tu contraseña</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Ingresa tu correo y te enviaremos un token de restablecimiento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-sm text-gray-700">
          <span className="font-medium">*Correo electrónico</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ingresa tu correo"
            disabled={isLoading}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3271a4]/30 focus:border-[#3271a4] disabled:opacity-60"
          />
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#3271a4] to-[#4384d8] text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
