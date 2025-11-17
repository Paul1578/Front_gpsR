"use client";

import { ArrowLeft } from "lucide-react";

interface RecoveryOptionsProps {
  className?: string;
  onSelectUsername: () => void;
  onSelectPassword: () => void;
  onBack: () => void;
}

export function RecoveryOptions({
  className,
  onSelectUsername,
  onSelectPassword,
  onBack,
}: RecoveryOptionsProps) {
  return (
    <div className={className} data-name="Recovery Options">
      <div className="absolute bg-white inset-0 rounded-[17px] z-0" />

      {/* Botón de regresar */}
      <button
        onClick={onBack}
        className="absolute flex items-center justify-center cursor-pointer bg-transparent border-none hover:opacity-70 transition-opacity z-50 p-0 w-5 h-5 sm:w-6 sm:h-6"
        style={{ top: 'calc(22.66% - 20px)', left: '11.44%' }}
        type="button"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#3271a4]" />
      </button>

      {/* Título */}
      <p className="absolute bottom-[67.34%] font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[calc(50%-0.5px)] not-italic text-[24px] sm:text-[28px] md:text-[32px] text-black text-center top-[22.66%] translate-x-[-50%] w-[270px]">
        ¿Qué deseas recuperar?
      </p>

      {/* Subtítulo */}
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[33%_9.97%_57%_11.44%] leading-[normal] not-italic text-[13px] sm:text-[14px] md:text-[16px] text-black text-center">
        Selecciona la opción que necesitas
      </p>

      {/* Botón Recuperar Usuario */}
      <button
        onClick={onSelectUsername}
        className="absolute bg-[#3271a4] inset-[48%_11.73%_46.5%_11.44%] rounded-[6px] hover:bg-[#2a5f8c] transition-colors cursor-pointer"
        type="button"
      >
        <div
          aria-hidden="true"
          className="absolute border-[#4384d8] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[6px]"
        />
        <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[20%_10%_20%_10%] leading-[normal] not-italic text-[13px] sm:text-[14px] md:text-[16px] text-white text-center flex items-center justify-center">
          Recuperar Usuario
        </p>
      </button>

      {/* Botón Recuperar Contraseña */}
      <button
        onClick={onSelectPassword}
        className="absolute bg-[#3271a4] inset-[55.5%_11.73%_39%_11.44%] rounded-[6px] hover:bg-[#2a5f8c] transition-colors cursor-pointer"
        type="button"
      >
        <div
          aria-hidden="true"
          className="absolute border-[#4384d8] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[6px]"
        />
        <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[20%_10%_20%_10%] leading-[normal] not-italic text-[13px] sm:text-[14px] md:text-[16px] text-white text-center flex items-center justify-center">
          Recuperar Contraseña
        </p>
      </button>
    </div>
  );
}
