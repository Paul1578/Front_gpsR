"use client";

import { motion } from "motion/react";
import { Users, Lock, Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl flex flex-col items-center text-center gap-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="inline-block">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3271a4] to-[#4384d8] flex items-center justify-center text-white shadow-xl">
              <Sparkles size={40} />
            </div>
          </div>
          <h1 className="text-gray-900 text-3xl md:text-4xl font-bold">
            Bienvenido a la aplicación
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            Una plataforma segura y fácil de usar para gestionar tu cuenta y acceder a todas tus funcionalidades.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            type="button"
            onClick={onGetStarted}
            className="px-8 py-4 bg-gradient-to-r from-[#3271a4] to-[#4384d8] text-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            aria-label="Comenzar ahora"
          >
            Comenzar ahora
          </button>
          <p className="text-gray-500 text-sm">
            ¿Ya tienes una cuenta? Inicia sesión para continuar
          </p>
        </motion.div>
      </div>
    </div>
  );
}

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
