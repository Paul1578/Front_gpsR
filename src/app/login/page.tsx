"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/Components/LoginForm";
import { useAuth } from "@/Context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoadingUser } = useAuth();

  useEffect(() => {
    if (!isLoadingUser && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoadingUser, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-[340px] aspect-[340/768] relative">
        <LoginForm
          className="relative size-full"
          onForgotPassword={() => router.push("/recovery/options")}
          onSwitchToRegister={() => router.push("/register")}
          onBack={() => router.push("/")}
        />
      </div>
    </div>
  );
}
