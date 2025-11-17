"use client";

import { motion } from "motion/react";
import { Users, Lock, Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-block mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3271a4] to-[#4384d8] flex items-center justify-center text-white shadow-xl">
              <Sparkles size={40} />
            </div>
          </div>
          <h1 className="text-gray-900 text-2xl md:text-3xl font-bold mb-4">
            Bienvenido a la aplicación
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Una plataforma segura y fácil de usar para gestionar tu cuenta y acceder a todas tus funcionalidades.
          </p>
        </motion.div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon={<Users className="text-[#3271a4]" size={24} />}
            title="Fácil de usar"
            description="Interfaz intuitiva diseñada para una experiencia de usuario fluida y agradable."
            bgColor="bg-blue-100"
          />
          <FeatureCard
            icon={<Lock className="text-purple-600" size={24} />}
            title="Seguro"
            description="Tus datos están protegidos con las mejores prácticas de seguridad."
            bgColor="bg-purple-100"
          />
          <FeatureCard
            icon={<Sparkles className="text-green-600" size={24} />}
            title="Personalizable"
            description="Adapta la plataforma a tus necesidades y preferencias personales."
            bgColor="bg-green-100"
          />
        </div>

        {/* Get Started */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <button
            type="button"
            onClick={onGetStarted}
            className="px-8 py-4 bg-gradient-to-r from-[#3271a4] to-[#4384d8] text-white rounded-xl hover:shadow-xl transition-all transform hover:scale-105"
            aria-label="Comenzar ahora"
          >
            Comenzar ahora
          </button>
          <p className="text-gray-500 text-sm mt-4">
            ¿Ya tienes una cuenta? Inicia sesión para continuar
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// Componente auxiliar para las tarjetas de características
function FeatureCard({
  icon,
  title,
  description,
  bgColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bgColor}`}>
        {icon}
      </div>
      <h3 className="text-gray-900 mb-2 text-base md:text-lg font-semibold">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </motion.div>
  );
}
