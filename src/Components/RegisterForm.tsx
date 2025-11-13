'use client';

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext"; // 🔹 Ajusta la ruta si tu contexto está en otra carpeta
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface RegisterFormProps {
  className?: string;
  onSwitchToLogin: () => void;
  onBack: () => void;
}

export default function RegisterForm({ className, onSwitchToLogin, onBack }: RegisterFormProps) {
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombres.trim() || !apellidos.trim() || !usuario.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);
    const success = await register({ nombres, apellidos, usuario, password });
    setIsLoading(false);

    if (success) {
      toast.success("¡Cuenta creada exitosamente! Bienvenido");
    } else {
      toast.error("Este usuario ya existe. Intenta con otro nombre de usuario");
    }
  };

  return (
    <div className={className} data-name="RegisterForm">
      <div className="absolute bg-white inset-0 rounded-[17px] z-0" />
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold inset-[16.5%_31.09%_78.42%_29.62%] leading-[normal] not-italic text-[24px] sm:text-[28px] md:text-[32px] text-black">
        Registro
      </p>
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[19.5%_15%_75%_15%] leading-[normal] not-italic text-[10px] sm:text-[11px] md:text-[12px] text-gray-600 text-center">
        Registra tu equipo como Gerente
      </p>

      <button
        onClick={onBack}
        className="absolute flex items-center justify-center cursor-pointer bg-transparent border-none hover:opacity-70 transition-opacity z-50 p-0 w-5 h-5 sm:w-6 sm:h-6"
        style={{ top: 'calc(16.5% - 20px)', left: 'calc(29.62% - 106px)' }}
        type="button"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#3271a4]" />
      </button>

      <form onSubmit={handleSubmit} className="contents">
        {/* Campo Nombres */}
        <div className="absolute contents inset-[21.48%_11.73%_70.7%_11.44%]">
          <p className="absolute font-['Inter:Regular',sans-serif] text-[12px] sm:text-[13px] md:text-[15px] text-black">
            Nombres
          </p>
          <div className="absolute inset-[24.35%_11.73%_70.7%_11.44%] rounded-[6px]">
            <div aria-hidden="true" className="absolute border border-[#958dbc] inset-0 rounded-[6px]" />
            <input
              type="text"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              className="absolute inset-0 bg-transparent px-2 py-1 outline-none rounded-[6px] text-[12px] sm:text-[13px] md:text-base"
            />
          </div>
        </div>

        {/* Campo Apellidos */}
        <div className="absolute contents inset-[31.77%_11.73%_60.42%_11.44%]">
          <p className="absolute text-[12px] sm:text-[13px] md:text-[15px] text-black">
            Apellidos
          </p>
          <div className="absolute inset-[34.63%_11.73%_60.42%_11.44%] rounded-[6px]">
            <div aria-hidden="true" className="absolute border border-[#958dbc] inset-0 rounded-[6px]" />
            <input
              type="text"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              className="absolute inset-0 bg-transparent px-2 py-1 outline-none rounded-[6px] text-[12px] sm:text-[13px] md:text-base"
            />
          </div>
        </div>

        {/* Campo Usuario */}
        <div className="absolute contents inset-[42.19%_11.73%_50.13%_11.44%]">
          <p className="absolute text-[12px] sm:text-[13px] md:text-[15px] text-black">
            Usuario
          </p>
          <div className="absolute inset-[45.05%_11.73%_50.13%_11.44%] rounded-[6px]">
            <div aria-hidden="true" className="absolute border border-[#958dbc] inset-0 rounded-[6px]" />
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="absolute inset-0 bg-transparent px-2 py-1 outline-none rounded-[6px] text-[12px] sm:text-[13px] md:text-base"
            />
          </div>
        </div>

        {/* Campo Contraseña */}
        <div className="absolute contents inset-[52.6%_11.73%_39.58%_11.44%]">
          <p className="absolute text-[12px] sm:text-[13px] md:text-[15px] text-black">
            Contraseña
          </p>
          <div className="absolute inset-[55.47%_11.73%_39.58%_11.44%] rounded-[6px]">
            <div aria-hidden="true" className="absolute border border-[#958dbc] inset-0 rounded-[6px]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="absolute inset-0 bg-transparent px-2 py-1 outline-none rounded-[6px] text-[12px] sm:text-[13px] md:text-base"
            />
          </div>
        </div>

        {/* Confirmar Contraseña */}
        <div className="absolute contents inset-[63.02%_11.73%_29.17%_11.44%]">
          <p className="absolute text-[12px] sm:text-[13px] md:text-[15px] text-black">
            Confirmar contraseña
          </p>
          <div className="absolute inset-[65.89%_11.73%_29.17%_11.44%] rounded-[6px]">
            <div aria-hidden="true" className="absolute border border-[#958dbc] inset-0 rounded-[6px]" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="absolute inset-0 bg-transparent px-2 py-1 outline-none rounded-[6px] text-[12px] sm:text-[13px] md:text-base"
            />
          </div>
        </div>

        {/* Botón de enviar */}
        <div className="absolute contents inset-[77.08%_11.73%_17.32%_11.44%]">
          <button
            type="submit"
            disabled={isLoading}
            className="absolute bg-[#3271a4] inset-[77.08%_11.73%_17.32%_11.44%] rounded-[6px] hover:bg-[#2a5f8c] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div aria-hidden="true" className="absolute border-[#4384d8] border-[1.5px] inset-0 rounded-[6px]" />
          </button>
          <p className="absolute font-semibold inset-[78.65%_35.48%_18.88%_34.9%] text-[13px] sm:text-[14px] md:text-[16px] text-white text-center">
            {isLoading ? "Creando..." : "Crear cuenta"}
          </p>
        </div>
      </form>

      <button
        onClick={onSwitchToLogin}
        className="absolute font-semibold inset-[89.84%_13.49%_7.68%_13.2%] text-[#3271a4] text-[12px] sm:text-[14px] md:text-[16px] text-center hover:underline cursor-pointer bg-transparent border-none"
      >
        ¿Ya tienes cuenta? Inicia sesión
      </button>
    </div>
  );
}
