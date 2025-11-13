"use client";

import { motion } from "framer-motion";
import { Users, Lock, Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Encabezado principal */}
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
          <h1 className="text-gray-900 mb-4 text-2xl md:text-3xl font-bold">
            Bienvenido a la aplicación
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Una plataforma segura y fácil de usar para gestionar tu cuenta y acceder a todas tus funcionalidades.
          </p>
        </motion.div>

        {/* Tarjetas informativas */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Fácil de usar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
              <Users className="text-[#3271a4]" size={24} />
            </div>
            <h3 className="text-gray-900 mb-2 font-semibold">Fácil de usar</h3>
            <p className="text-gray-600 text-sm">
              Interfaz intuitiva diseñada para una experiencia de usuario fluida y agradable.
            </p>
          </motion.div>

          {/* Seguro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <Lock className="text-purple-600" size={24} />
            </div>
            <h3 className="text-gray-900 mb-2 font-semibold">Seguro</h3>
            <p className="text-gray-600 text-sm">
              Tus datos están protegidos con las mejores prácticas de seguridad.
            </p>
          </motion.div>

          {/* Personalizable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
          >
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
              <Sparkles className="text-green-600" size={24} />
            </div>
            <h3 className="text-gray-900 mb-2 font-semibold">Personalizable</h3>
            <p className="text-gray-600 text-sm">
              Adapta la plataforma a tus necesidades y preferencias personales.
            </p>
          </motion.div>
        </div>

        {/* Botón principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-gradient-to-r from-[#3271a4] to-[#4384d8] text-white rounded-xl hover:shadow-xl transition-all transform hover:scale-105"
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
