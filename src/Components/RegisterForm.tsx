"use client";

import { useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface RegisterFormProps {
  className?: string;
  onSwitchToLogin: () => void;
  onBack: () => void;
}

export function RegisterForm({ className, onSwitchToLogin, onBack }: RegisterFormProps) {
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
      toast.error("Este correo ya existe. Intenta con otro correo");
    }
  };

  return (
    <div className={`relative ${className ?? ""}`} data-name="RegisterForm">
      <div className="absolute bg-white inset-0 rounded-[17px] z-0" />

      <p className="absolute font-['Inter:Bold',sans-serif] font-bold inset-[16.5%_31.09%_78.42%_29.62%] leading-[normal] text-[24px] sm:text-[28px] md:text-[32px] text-black">
        Registro
      </p>

      <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[19.5%_15%_75%_15%] leading-[normal] text-[10px] sm:text-[11px] md:text-[12px] text-gray-600 text-center">
        Registra tu equipo como Gerente
      </p>

      <button
        onClick={onBack}
        className="absolute flex items-center justify-center cursor-pointer bg-transparent border-none hover:opacity-70 transition-opacity z-50 p-0 w-5 h-5 sm:w-6 sm:h-6"
        style={{ top: "calc(16.5% - 20px)", left: "calc(29.62% - 106px)" }}
        type="button"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#3271a4]" />
      </button>

      <form onSubmit={handleSubmit} className="relative size-full">
        <InputField label="Nombres" value={nombres} onChange={setNombres} topInset="24.35%" />
        <InputField label="Apellidos" value={apellidos} onChange={setApellidos} topInset="34.63%" />
        <InputField
          label="Correo electrónico"
          value={usuario}
          onChange={setUsuario}
          topInset="45.05%"
          type="email"
        />
        <InputField label="Contraseña" value={password} onChange={setPassword} topInset="55.47%" type="password" />
        <InputField
          label="Confirmar contraseña"
          value={confirmPassword}
          onChange={setConfirmPassword}
          topInset="65.89%"
          type="password"
        />

        <div className="absolute inset-[77.08%_11.73%_17.32%_11.44%]">
          <button
            type="submit"
            disabled={isLoading}
            className="absolute bg-[#3271a4] inset-0 rounded-[6px] hover:bg-[#2a5f8c] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              aria-hidden="true"
              className="absolute border-[#4384d8] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[6px]"
            />
          </button>
          <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[1.57%_35.48%_18.88%_34.9%] leading-[normal] text-[13px] sm:text-[14px] md:text-[16px] text-white text-center pointer-events-none">
            {isLoading ? "Creando..." : "Crear cuenta"}
          </p>
        </div>
      </form>

      <button
        onClick={onSwitchToLogin}
        className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[89.84%_13.49%_7.68%_13.2%] leading-[normal] text-[#3271a4] text-[12px] sm:text-[14px] md:text-[16px] text-center hover:underline cursor-pointer bg-transparent border-none"
      >
        ¿Ya tienes cuenta? Inicia sesión
      </button>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  topInset: string;
  type?: string;
}

function InputField({ label, value, onChange, topInset, type = "text" }: InputFieldProps) {
  return (
    <div className="absolute" style={{ inset: `${topInset} 11.73% auto 11.44%` }}>
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[0_52.2%_0_0] leading-[normal] text-[12px] sm:text-[13px] md:text-[15px] text-black">
        {label}
      </p>
      <div className="absolute inset-0 rounded-[6px]">
        <div aria-hidden="true" className="absolute border border-[#958dbc] border-solid inset-0 pointer-events-none rounded-[6px]" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 bg-transparent px-2 sm:px-3 py-1 sm:py-1.5 outline-none rounded-[6px] text-[12px] sm:text-[13px] md:text-base"
        />
      </div>
    </div>
  );
}
