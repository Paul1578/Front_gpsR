"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import svgPaths from "@/app/imports/svg-6ghumyj5xj"; // ajusta la ruta según tu estructura

interface RecoverPasswordProps {
  className?: string;
  onBack: () => void;
}

export default function RecoverPassword({ className, onBack }: RecoverPasswordProps) {
  const [usuario, setUsuario] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuario.trim()) {
      toast.error("Por favor ingresa tu usuario");
      return;
    }

    setIsLoading(true);

    // Simula envío de email
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const userExists = users.some((u: any) => u.usuario === usuario);

    setIsLoading(false);

    if (userExists) {
      toast.success("Se ha enviado una contraseña temporal al correo electrónico registrado");
      setTimeout(() => {
        setUsuario("");
        onBack();
      }, 3000);
    } else {
      toast.error("Usuario no encontrado");
    }
  };

  return (
    <div className={className} data-name="Component 4">
      {/* Fondo */}
      <div className="absolute bg-white inset-0 rounded-[17px] z-0" />

      {/* Botón regresar */}
      <button
        onClick={onBack}
        className="absolute flex items-center justify-center cursor-pointer bg-transparent border-none hover:opacity-70 transition-opacity z-50 p-0 w-5 h-5 sm:w-6 sm:h-6"
        style={{ top: "calc(22.66% - 20px)", left: "11.44%" }}
        type="button"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#3271a4]" />
      </button>

      {/* Título */}
      <p className="absolute bottom-[67.34%] font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[calc(50%-0.5px)] not-italic text-[24px] sm:text-[28px] md:text-[32px] text-black text-center top-[22.66%] translate-x-[-50%] w-[270px]">
        Recuperemos tu contraseña
      </p>

      {/* Descripción */}
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[33%_9.97%_57%_11.44%] leading-[normal] not-italic text-[13px] sm:text-[14px] md:text-[16px] text-black">
        Ingresa tu usuario y enviaremos una contraseña temporal al correo electrónico registrado
      </p>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="contents">
        {/* Etiqueta */}
        <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[44%_11.73%_52%_11.44%] leading-[normal] not-italic text-[13px] sm:text-[14px] md:text-[16px] text-black">
          *Nombre de usuario
        </p>

        {/* Campo de texto */}
        <div className="absolute inset-[46.5%_11.73%_48.5%_11.44%] rounded-[6px]">
          <div
            aria-hidden="true"
            className="absolute border border-[#958dbc] border-solid inset-0 pointer-events-none rounded-[6px]"
          />
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="absolute inset-0 bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 outline-none rounded-[6px] text-[13px] sm:text-[14px] md:text-base text-[#817e7e]"
            placeholder="Ingresa tu usuario"
            disabled={isLoading}
          />
        </div>

        {/* Botón Enviar */}
        <div className="absolute contents inset-[80%_11.73%_14.4%_11.44%]">
          <button
            type="submit"
            disabled={isLoading}
            className="absolute bg-[#3271a4] inset-[80%_11.73%_14.4%_11.44%] rounded-[6px] hover:bg-[#2a5f8c] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              aria-hidden="true"
              className="absolute border-[#4384d8] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[6px]"
            />
          </button>
          <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[81.5%_43.11%_15.9%_42.52%] leading-[normal] not-italic text-[13px] sm:text-[14px] md:text-[16px] text-nowrap text-white whitespace-pre pointer-events-none">
            {isLoading ? "Enviando..." : "Enviar"}
          </p>
        </div>
      </form>
    </div>
  );
}
