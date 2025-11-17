"use client";

import { useRouter } from "next/navigation";
import { RecoverPassword } from "@/Components/RecoverPassword";

export default function RecoverPasswordPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-[340px] aspect-[340/768] relative">
        <RecoverPassword
          className="relative size-full"
          onBack={() => router.push("/recovery/options")}
        />
      </div>
    </div>
  );
}
