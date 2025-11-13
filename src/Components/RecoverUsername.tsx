"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import svgPaths from "@/app/imports/svg-3p7rujo7lp"; // ajusta la ruta si está en otra carpeta

interface RecoverUsernameProps {
  className?: string;
  onBack: () => void;
}

export default function RecoverUsername({ className, onBack }: RecoverUsernameProps) {
  const [identificacion, setIdentificacion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identificacion.trim()) {
      toast.error("Por favor ingresa tu número de identificación");
      return;
    }

    setIsLoading(true);

    // Simula envío (puedes reemplazar con API real)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u: any) => u.identificacion === identificacion);

    setIsLoading(false);

    if (user) {
      toast.success(`Tu usuario es: ${user.usuario}. Se ha enviado también a tu correo electrónico.`);
      setTimeout(() => {
        setIdentificacion("");
        onBack();
      }, 3000);
    } else {
      toast.error("No se encontró ningún usuario con ese número de identificación");
    }
  };

  return (
    <div className={className} data-name="Component 3">
      <div className="absolute bg-white inset-0 rounded-[17px] z-0" />

      <button
        onClick={onBack}
        className="absolute flex items-center justify-center cursor-pointer bg-transparent border-none hover:opacity-70 transition-opacity z-50 p-0 w-5 h-5 sm:w-6 sm:h-6"
        style={{ top: "calc(22.66% - 20px)", left: "11.44%" }}
        type="button"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#3271a4]" />
      </button>

      <p className="absolute bottom-[67.34%] font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[calc(50%-0.5px)] not-italic text-[24px] sm:text-[28px] md:text-[32px] text-black text-center top-[22.66%] translate-x-[-50%] w-[270px]">
        Recuperemos tu usuario
      </p>

      <div className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[33%_9.97%_59%_11.44%] leading-[normal] not-italic text-[13px] sm:text-[14px] md:text-[16px] text-black">
        <p className="mb-0">Ingresa tu número de identificación</p>
        <p>y enviaremos tu usuario al correo electrónico</p>
      </div>

      <form onSubmit={handleSubmit} className="contents">
        <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[44%_11.73%_52%_11.44%] leading-[normal] not-italic text-[13px] sm:text-[14px] md:text-[16px] text-black">
          *Número de identificación
        </p>

        <div className="absolute inset-[46.5%_11.73%_48.5%_11.44%] rounded-[6px]">
          <div
            aria-hidden="true"
            className="absolute border border-[#958dbc] border-solid inset-0 pointer-events-none rounded-[6px]"
          />
          <input
            type="text"
            value={identificacion}
            onChange={(e) => setIdentificacion(e.target.value)}
            className="absolute inset-0 bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 outline-none rounded-[6px] text-[13px] sm:text-[14px] md:text-base text-[#817e7e]"
            placeholder="Ingresa tu número de identificación"
            disabled={isLoading}
          />
        </div>

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
