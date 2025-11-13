'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Truck, Route, History, Edit2, Check, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

interface TeamDetailsViewProps {
  teamId: string
  onBack: () => void
}

export default function TeamDetailsView({ teamId, onBack }: TeamDetailsViewProps) {
  const { getAllUsers } = useAuth()
  const [activeTab, setActiveTab] = useState<'team' | 'vehicles' | 'routes' | 'history'>('team')
  const [editingTeamName, setEditingTeamName] = useState(false)
  const [tempTeamName, setTempTeamName] = useState('')
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [manager, setManager] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [teamVehicles, setTeamVehicles] = useState<any[]>([])
  const [teamRoutes, setTeamRoutes] = useState<any[]>([])
  const [activeRoutes, setActiveRoutes] = useState<any[]>([])
  const [completedRoutes, setCompletedRoutes] = useState<any[]>([])

  // 🔹 Carga de datos en cliente
  useEffect(() => {
    const users = getAllUsers()
    setAllUsers(users)

    const managerData = users.find((u: any) => u.id === teamId)
    const members = users.filter((u: any) => u.teamId === teamId)
    setManager(managerData)
    setTeamMembers(members)

    const vehicles = JSON.parse(localStorage.getItem('vehicles') || '[]')
    const routes = JSON.parse(localStorage.getItem('routes') || '[]')

    const filteredVehicles = vehicles.filter((v: any) => v.teamId === teamId)
    const filteredRoutes = routes.filter((r: any) => r.teamId === teamId)

    setTeamVehicles(filteredVehicles)
    setTeamRoutes(filteredRoutes)
    setActiveRoutes(filteredRoutes.filter((r: any) => r.estado === 'en_progreso'))
    setCompletedRoutes(filteredRoutes.filter((r: any) => r.estado === 'completada'))
  }, [teamId, getAllUsers])

  if (!manager) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">Equipo no encontrado</p>
      </div>
    )
  }

  const handleEditTeamName = () => {
    setTempTeamName(manager.teamName || `Equipo de ${manager.nombres}`)
    setEditingTeamName(true)
  }

  const handleSaveTeamName = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const index = users.findIndex((u: any) => u.id === teamId)
    if (index !== -1) {
      users[index].teamName = tempTeamName
      localStorage.setItem('users', JSON.stringify(users))
      setEditingTeamName(false)
      toast.success('Nombre del equipo actualizado')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'gerente':
        return 'bg-blue-100 text-blue-800'
      case 'logistica':
        return 'bg-purple-100 text-purple-800'
      case 'chofer':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'gerente':
        return 'Gerente'
      case 'logistica':
        return 'Logística'
      case 'chofer':
        return 'Chofer'
      default:
        return role
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              {editingTeamName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempTeamName}
                    onChange={(e) => setTempTeamName(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                  <button
                    onClick={handleSaveTeamName}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setEditingTeamName(false)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl text-gray-900">
                    {manager.teamName || `Equipo de ${manager.nombres} ${manager.apellidos}`}
                  </h1>
                  <button
                    onClick={handleEditTeamName}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-600">
                Gerente: {manager.nombres} {manager.apellidos} (@{manager.usuario})
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Users size={16} />} label="Miembros" value={teamMembers.length + 1} color="blue" />
            <StatCard icon={<Truck size={16} />} label="Vehículos" value={teamVehicles.length} color="green" />
            <StatCard icon={<Route size={16} />} label="Rutas Activas" value={activeRoutes.length} color="purple" />
            <StatCard icon={<History size={16} />} label="Completadas" value={completedRoutes.length} color="orange" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Contenido dinámico */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'team' && (
            <TeamTab
              manager={manager}
              teamMembers={teamMembers}
              getRoleColor={getRoleColor}
              getRoleLabel={getRoleLabel}
            />
          )}
          {activeTab === 'vehicles' && <VehiclesTab teamVehicles={teamVehicles} />}
          {activeTab === 'routes' && (
            <RoutesTab activeRoutes={activeRoutes} allUsers={allUsers} allVehicles={teamVehicles} />
          )}
          {activeTab === 'history' && (
            <HistoryTab completedRoutes={completedRoutes} allUsers={allUsers} allVehicles={teamVehicles} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Subcomponentes ------------------------------ */

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className={`bg-${color}-50 rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className={`text-xs text-${color}-800`}>{label}</p>
      </div>
      <p className={`text-xl text-${color}-900`}>{value}</p>
    </div>
  )
}

function Tabs({ activeTab, setActiveTab }: any) {
  const tabs = [
    { id: 'team', label: 'Equipo', icon: Users },
    { id: 'vehicles', label: 'Vehículos', icon: Truck },
    { id: 'routes', label: 'Rutas Activas', icon: Route },
    { id: 'history', label: 'Historial', icon: History },
  ]

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
