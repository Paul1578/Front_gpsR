"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/Components/Dashboard";
import { useAuth } from "@/Context/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoadingUser } = useAuth();

  useEffect(() => {
    if (!isLoadingUser && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoadingUser, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <Dashboard />;
}
