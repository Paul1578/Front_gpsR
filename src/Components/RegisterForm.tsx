"use client";

import { useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

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
    <div
      className={`bg-white rounded-2xl shadow-lg px-6 py-8 sm:px-8 sm:py-10 flex flex-col gap-6 ${className ?? ""}`}
      data-name="RegisterForm"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center rounded-full p-2 text-[#3271a4] hover:bg-blue-50 transition-colors"
          type="button"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-tight">Registro</p>
          <p className="text-sm text-gray-600 leading-tight">Registra tu equipo como Gerente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField label="Nombres" value={nombres} onChange={setNombres} />
        <InputField label="Apellidos" value={apellidos} onChange={setApellidos} />
        <InputField
          label="Correo electrónico"
          value={usuario}
          onChange={setUsuario}
          type="email"
        />
        <InputField label="Contraseña" value={password} onChange={setPassword} type="password" />
        <InputField
          label="Confirmar contraseña"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type="password"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full bg-[#3271a4] text-white font-semibold py-3 rounded-lg hover:bg-[#2a5f8c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <button
        onClick={onSwitchToLogin}
        className="text-sm font-semibold text-[#3271a4] hover:underline"
        type="button"
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
  type?: string;
}

function InputField({ label, value, onChange, type = "text" }: InputFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && isVisible ? "text" : type;

  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      <span>{label}</span>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`border border-[#958dbc] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[#3271a4]/40 focus:border-[#3271a4] ${isPassword ? "pr-10" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsVisible((prev) => !prev)}
            className="absolute inset-y-0 right-2 flex items-center text-[#3271a4] hover:text-[#244f73]"
            aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </label>
  );
}
