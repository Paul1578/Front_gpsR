"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/Components/WelcomeScreen";
import { useAuth } from "@/Context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoadingUser } = useAuth();

  useEffect(() => {
    if (!isLoadingUser && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoadingUser, router]);

  const handleGetStarted = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hasVisited", "true");
    }
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl">
        <WelcomeScreen onGetStarted={handleGetStarted} />
      </div>
    </div>
  );
}
