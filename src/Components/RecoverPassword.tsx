"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface RecoverPasswordProps {
  className?: string;
  onBack: () => void;
}

export function RecoverPassword({ className, onBack }: RecoverPasswordProps) {
  const [usuario, setUsuario] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuario.trim()) {
      toast.error("Por favor ingresa tu usuario");
      return;
    }

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const userExists = users.some((u: any) => u.usuario === usuario);

    setIsLoading(false);

    if (userExists) {
      toast.success("Se ha enviado una contrasena temporal al correo electronico registrado");
      setTimeout(() => {
        setUsuario("");
        onBack();
      }, 3000);
    } else {
      toast.error("Usuario no encontrado");
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
        <h1 className="text-3xl font-semibold text-gray-900">Recuperemos tu contrasena</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Ingresa tu usuario y enviaremos una contrasena temporal al correo electronico registrado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-sm text-gray-700">
          <span className="font-medium">*Nombre de usuario</span>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Ingresa tu usuario"
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
