"use client";

import { useRouter } from "next/navigation";
import { RecoveryOptions } from "@/Components/RecoveryOptions";

export default function RecoveryOptionsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-[340px] aspect-[340/768] relative">
        <RecoveryOptions
          className="relative size-full"
          onSelectUsername={() => router.push("/recovery/username")}
          onSelectPassword={() => router.push("/recovery/password")}
          onBack={() => router.push("/login")}
        />
      </div>
    </div>
  );
}
