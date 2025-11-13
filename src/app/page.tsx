"use client";

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FleetProvider } from "@/context/FleetContext";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { Dashboard } from "@/components/Dashboard";
import { RecoveryOptions } from "@/components/RecoveryOptions";
import { RecoverUsername } from "@/components/RecoverUsername";
import { RecoverPassword } from "@/components/RecoverPassword";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Toaster } from "sonner";

function AppContent() {
  const [view, setView] = useState<
    | "welcome"
    | "login"
    | "register"
    | "recovery-options"
    | "recover-username"
    | "recover-password"
  >("welcome");

  const { isAuthenticated } = useAuth();

  // Verificar si es la primera visita
  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisited");
    if (hasVisited) {
      setView("login");
    }
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem("hasVisited", "true");
    setView("login");
  };

  const handleForgotPassword = () => {
    setView("recovery-options");
  };

  // Si el usuario está autenticado, mostrar el dashboard
  if (isAuthenticated) {
    return <Dashboard />;
  }

  // Mostrar pantalla de bienvenida
  if (view === "welcome") {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  // Si no está autenticado, mostrar login o registro
  return (
    <div className="size-full flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-[340px] aspect-[340/768] relative">
        {view === "login" && (
          <LoginForm
            className="relative size-full"
            onForgotPassword={handleForgotPassword}
            onSwitchToRegister={() => setView("register")}
            onBack={() => setView("welcome")}
          />
        )}
        {view === "register" && (
          <RegisterForm
            className="relative size-full"
            onSwitchToLogin={() => setView("login")}
            onBack={() => setView("welcome")}
          />
        )}
        {view === "recovery-options" && (
          <RecoveryOptions
            className="relative size-full"
            onSelectUsername={() => setView("recover-username")}
            onSelectPassword={() => setView("recover-password")}
            onBack={() => setView("login")}
          />
        )}
        {view === "recover-username" && (
          <RecoverUsername
            className="relative size-full"
            onBack={() => setView("recovery-options")}
          />
        )}
        {view === "recover-password" && (
          <RecoverPassword
            className="relative size-full"
            onBack={() => setView("recovery-options")}
          />
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <FleetProvider>
        <AppContent />
        <Toaster position="top-center" richColors />
      </FleetProvider>
    </AuthProvider>
  );
}
