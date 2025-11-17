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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-[340px] aspect-[340/768] relative">
        <RegisterForm
          className="relative size-full"
          onSwitchToLogin={() => router.push("/login")}
          onBack={() => router.push("/")}
        />
      </div>
    </div>
  );
}
