"use client";

export default function RecoverUsernamePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center space-y-3">
        <h1 className="text-xl font-semibold text-gray-900">Recuperación de usuario deshabilitada</h1>
        <p className="text-sm text-gray-600">
          Este flujo no está disponible porque el backend no expone /Auth/forgot-username. Dejamos esta página como
          recordatorio por si en el futuro se habilita nuevamente.
        </p>
      </div>
    </div>
  );
}
