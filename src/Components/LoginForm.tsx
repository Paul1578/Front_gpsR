"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface LoginFormProps {
  className?: string;
  onForgotPassword: () => void;
  onSwitchToRegister: () => void;
  onBack: () => void;
}

export default function LoginForm({
  className,
  onForgotPassword,
  onSwitchToRegister,
  onBack,
}: LoginFormProps) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuario.trim() || !password.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setIsLoading(true);
    const success = await login(usuario, password);
    setIsLoading(false);

    if (success) {
      toast.success("¡Bienvenido!");
    } else {
      toast.error("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className={className} data-name="Component 1">
      <div className="absolute bg-white inset-0 rounded-[17px] z-0" />

      <p className="absolute font-['Inter:Bold',sans-serif] font-bold inset-[22.66%_36.36%_72.27%_36.07%] leading-[normal] text-[24px] sm:text-[28px] md:text-[32px] text-black">
        Login
      </p>

      <button
        onClick={onBack}
        className="absolute flex items-center justify-center cursor-pointer bg-transparent border-none hover:opacity-70 transition-opacity z-50 p-0 w-5 h-5 sm:w-6 sm:h-6"
        style={{
          top: "calc(22.66% - 20px)",
          left: "calc(36.07% - 106px)",
        }}
        type="button"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#3271a4]" />
      </button>

      <form onSubmit={handleSubmit} className="contents">
        {/* Usuario */}
        <div className="absolute contents inset-[38.15%_11.73%_54.04%_11.44%]">
          <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[38.15%_52.2%_57.68%_11.44%] text-[13px] sm:text-[14px] md:text-[16px] text-black">
            Usuario
          </p>
          <div className="absolute inset-[41.02%_11.73%_54.04%_11.44%] rounded-[6px]">
            <div
              aria-hidden="true"
              className="absolute border border-[#958dbc] border-solid inset-0 pointer-events-none rounded-[6px]"
            />
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="absolute inset-0 bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 outline-none rounded-[6px] text-[13px] sm:text-[14px] md:text-base"
            />
          </div>
        </div>

        {/* Contraseña */}
        <div className="absolute contents inset-[51.3%_11.73%_40.88%_11.44%]">
          <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[51.3%_52.2%_44.53%_11.44%] text-[13px] sm:text-[14px] md:text-[16px] text-black">
            Contraseña
          </p>
          <div className="absolute inset-[54.17%_11.73%_40.88%_11.44%] rounded-[6px]">
            <div
              aria-hidden="true"
              className="absolute border border-[#958dbc] border-solid inset-0 pointer-events-none rounded-[6px]"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="absolute inset-0 bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 outline-none rounded-[6px] text-[13px] sm:text-[14px] md:text-base"
            />
          </div>
        </div>

        {/* Botón de login */}
        <div className="absolute contents inset-[66.54%_11.73%_27.86%_11.44%]">
          <button
            type="submit"
            disabled={isLoading}
            className="absolute bg-[#3271a4] inset-[66.54%_11.73%_27.86%_11.44%] rounded-[6px] hover:bg-[#2a5f8c] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              aria-hidden="true"
              className="absolute border-[#4384d8] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[6px]"
            />
          </button>
          <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[68.1%_34.9%_29.43%_34.6%] text-[13px] sm:text-[14px] md:text-[16px] text-white pointer-events-none">
            {isLoading ? "Cargando..." : "Iniciar Sesión"}
          </p>
        </div>
      </form>

      {/* Enlaces secundarios */}
      <button
        onClick={onForgotPassword}
        className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[80%_24.05%_14.84%_23.75%] text-[#3271a4] text-[12px] sm:text-[14px] md:text-[16px] text-center hover:underline"
      >
        <p className="mb-0">¿Olvidaste tu usuario o</p>
        <p>contraseña?</p>
      </button>

      <button
        onClick={onSwitchToRegister}
        className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[89.84%_13.49%_7.68%_13.2%] text-[#3271a4] text-[12px] sm:text-[14px] md:text-[16px] text-center hover:underline"
      >
        ¿Aún no tienes cuenta? Regístrate
      </button>
    </div>
  );
}
