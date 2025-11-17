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
      toast.success("¡Bienvenido!");
    } else {
      toast.error("Correo o contraseña incorrectos");
    }
  };

  return (
    <div className={`max-w-md w-full mx-auto mt-20 p-6 bg-white rounded-xl shadow-md ${className}`}>
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Login</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Correo */}
        <div className="flex flex-col">
          <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="nombre@empresa.com"
          />
        </div>

        {/* Contraseña */}
        <div className="flex flex-col">
          <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="Ingresa tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Cargando..." : "Iniciar Sesión"}
        </button>
      </form>

      {/* Forgot Password */}
      <button
        type="button"
        onClick={onForgotPassword}
        className="mt-4 text-sm text-blue-600 hover:underline"
      >
        ¿Olvidaste tu usuario o contraseña?
      </button>

      {/* Switch to Register */}
      <button
        type="button"
        onClick={onSwitchToRegister}
        className="mt-2 text-sm text-blue-600 hover:underline"
      >
        ¿Aún no tienes cuenta? Regístrate
      </button>
    </div>
  );
}
