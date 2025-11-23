"use client";

import { useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  className?: string;
  onForgotPassword: () => void;
  onSwitchToRegister: () => void;
  onBack: () => void;
}

export function LoginForm({ className, onForgotPassword, onSwitchToRegister, onBack }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      toast.success("Bienvenido!");
    } else {
      toast.error("Correo o contrasena incorrectos");
    }
  };

  return (
    <div
      className={`w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-50 px-6 py-8 sm:px-8 sm:py-10 flex flex-col gap-6 ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center w-10 h-10 rounded-full text-[#3271a4] hover:bg-blue-50 transition-colors"
        aria-label="Volver"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Iniciar sesion</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Accede a tu cuenta y continua gestionando tu flota con seguridad.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Correo electronico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3271a4]/30 focus:border-[#3271a4]"
            placeholder="nombre@empresa.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Contrasena
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3271a4]/30 focus:border-[#3271a4] pr-12"
              placeholder="Ingresa tu contrasena"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={onForgotPassword}
            className="self-end text-sm font-semibold text-[#3271a4] hover:text-[#275b84] hover:underline transition-colors"
          >
            Olvidaste tu contrasena?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#3271a4] to-[#4384d8] text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Cargando..." : "Iniciar sesion"}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-sm font-semibold text-[#3271a4] hover:text-[#275b84] hover:underline transition-colors"
        >
          Aun no tienes cuenta? Registrate
        </button>
      </div>
    </div>
  );
}
