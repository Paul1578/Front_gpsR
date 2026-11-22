"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/Components/RegisterForm";
import { useAuth } from "@/Context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoadingUser } = useAuth();

  useEffect(() => {
    if (!isLoadingUser && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoadingUser, router]);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[35%_65%] bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <RegisterForm
            onSwitchToLogin={() => router.push("/login")}
            onBack={() => router.push("/login")}
          />
        </div>
      </div>

      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-[#1f4f73] via-[#3271a4] to-[#7cc3ff]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1300&q=80')] bg-cover bg-center opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-[#3271a4]/40 to-transparent" />
        <div className="relative m-10 rounded-3xl border border-white/30 bg-white/10 backdrop-blur-xl shadow-2xl flex flex-col justify-between p-10 text-white">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-white/80">Bienvenida</p>
            <h2 className="text-3xl font-semibold leading-tight">Crea tu cuenta y gestiona tu equipo</h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Diseñado para crecer contigo: seguridad, control y una experiencia fluida.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/15 p-4 border border-white/20">
              <p className="text-sm text-white/80">Tiempo de alta</p>
              <p className="text-2xl font-semibold">3 min</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 border border-white/20">
              <p className="text-sm text-white/80">Equipos</p>
              <p className="text-2xl font-semibold">Ilimitado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
