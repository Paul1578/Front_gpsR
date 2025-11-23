"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search || "";
    const match = search.match(/[?&]token=([^&]+)/);
    const rawToken = match ? match[1] : "";
    setToken(rawToken);
  }, []);

  const passwordsMismatch = useMemo(
    () =>
      newPassword.length > 0 &&
      confirmNewPassword.length > 0 &&
      newPassword !== confirmNewPassword,
    [newPassword, confirmNewPassword]
  );

  const disabled =
    !token ||
    !newPassword ||
    !confirmNewPassword ||
    isLoading ||
    passwordsMismatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!token) {
      setError("El enlace no es válido o ya expiró. Solicita un nuevo correo.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (passwordsMismatch) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/backend/Auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmNewPassword,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => router.push("/login"), 1800);
      } else if (response.status === 401) {
        const data = await response.json().catch(() => null);
        setError((data && data.message) || "Token inválido.");
      } else {
        const data = await response.json().catch(() => null);
        setError(
          (data && data.message) || "No pudimos actualizar tu contraseña. Inténtalo de nuevo en unos minutos."
        );
      }
    } catch (err) {
      setError("Hubo un problema de conexión. Por favor, inténtalo nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -left-20 top-10 w-72 h-72 bg-[#3271a4]/20 blur-3xl rounded-full" />
        <div className="absolute right-10 bottom-0 w-80 h-80 bg-[#7cc3ff]/25 blur-3xl rounded-full" />
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
        <div className="hidden lg:block h-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#1f4f73] via-[#3271a4] to-[#7cc3ff] shadow-xl border border-white/10">
          <div className="relative h-full">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-[#3271a4]/60 to-transparent" />
            <div className="relative h-full flex flex-col justify-between p-10 text-white">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.2em] text-white/70">Seguridad</p>
                <h2 className="text-3xl font-semibold leading-tight">Restablece tu acceso con confianza</h2>
                <p className="text-white/80 text-sm leading-relaxed">
                  Protegemos tu cuenta con enlaces de un solo uso y tokens de 12 caracteres. Completa el formulario para
                  activar tu nueva contraseña.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/15 p-4 border border-white/20 backdrop-blur">
                  <p className="text-sm text-white/80">Tokens válidos</p>
                  <p className="text-2xl font-semibold">12 caracteres</p>
                </div>
                <div className="rounded-2xl bg-white/15 p-4 border border-white/20 backdrop-blur">
                  <p className="text-sm text-white/80">Respuesta</p>
                  <p className="text-2xl font-semibold">Tiempo real</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-blue-50 p-8 sm:p-10 space-y-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-[#235075] px-4 py-2 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                Enlace seguro de restablecimiento
              </div>
              <h1 className="text-3xl font-semibold text-gray-900">Crea una nueva contraseña</h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                Tu token se envió por correo. Por seguridad, el enlace expira pronto. El botón se activará cuando
                detectemos el token.
              </p>
            </div>

            <div className="space-y-3">
              {!token && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 px-4 py-3 text-sm">
                  No encontramos el token en el enlace. Intenta abrir nuevamente el correo o solicita uno nuevo.
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Tu contraseña fue actualizada. Redirigiendo al inicio de sesión...
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="flex flex-col gap-2 text-sm text-gray-700">
                <span className="font-medium">Nueva contraseña</span>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    minLength={8}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa una nueva contraseña"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3271a4]/30 focus:border-[#3271a4] disabled:opacity-60 pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                    aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm text-gray-700">
                <span className="font-medium">Confirmar contraseña</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    minLength={8}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repite tu nueva contraseña"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3271a4]/30 focus:border-[#3271a4] disabled:opacity-60 pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              {passwordsMismatch && (
                <div className="text-xs text-red-600">Las contraseñas no coinciden.</div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Mínimo 8 caracteres. No compartas este formulario.</span>
                {token ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Token listo
                  </span>
                ) : (
                  <span className="text-amber-600">Esperando token...</span>
                )}
              </div>

              <button
                type="submit"
                disabled={disabled}
                className="w-full bg-gradient-to-r from-[#3271a4] to-[#4384d8] text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar contraseña"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
