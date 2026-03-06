'use client'

import { useState, useEffect } from 'react'
import { getTeamMembers } from './actions'
import { Users, Bot, Lock, AlertCircle, ChevronRight, Phone, UserPlus } from 'lucide-react'
import { User } from '@/types/database'
import { EmployeeDrawer } from './EmployeeDrawer'
import { AddEmployeeModal } from './AddEmployeeModal'

export default function EquipePage() {
    const [team, setTeam] = useState<User[]>([])
    const [error, setError] = useState<string | null>(null)
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const res = await getTeamMembers()
        if (res.error) setError(res.error)
        else setTeam(res.data || [])
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-purple-100 text-purple-700">Dono / Admin</span>
            case 'manager': return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-blue-100 text-blue-700">Gerente</span>
            default: return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-gray-100 text-gray-700">Equipe</span>
        }
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-gray-100 max-w-md">
                    <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 space-y-6">

                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            Gestão de Equipe & RH
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Controle acessos e Permissões do Robô IA p/ seus funcionários</p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Adicionar Funcionário</span>
                    </button>
                </div>

                {/* KPI/Briefing Card */}
                <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm shrink-0">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">O Chat Biométrico (Modo Gerencial)</h3>
                            <p className="text-blue-100 text-sm mt-1 max-w-3xl leading-relaxed">
                                Cadastre o número de WhatsApp pessoal de cada funcionário abaixo. Quando eles chamarem a Inteligência Artificial pelo WhatsApp Gerencial da Empresa, o robô os reconhecerá automaticamente e responderá se baseando estritamente nas regras e permissões que você ditar na "Bula".
                            </p>
                        </div>
                    </div>
                </div>

                {/* Listagem de Membros */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gray-50/30">
                        <h3 className="text-base font-bold text-gray-900">Membros do Sistema ({team.length})</h3>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {team.map(member => (
                            <div
                                key={member.id}
                                onClick={() => setSelectedEmployee(member)}
                                className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shadow-sm">
                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-gray-900">{member.name || "Sem Nome"}</h4>
                                            {getRoleBadge(member.role)}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                            <span>{member.email}</span>
                                            {member.business_phone ? (
                                                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    <Phone className="w-3 h-3" />
                                                    {member.business_phone}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-orange-500">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Sem Zap Biométrico
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Regras IA (Bula)</p>
                                        <p className="text-xs text-gray-500 max-w-[200px] truncate mt-0.5">
                                            {member.ai_instructions ? member.ai_instructions : "Nenhuma regra (IA solta)"}
                                        </p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:border-blue-300 group-hover:bg-blue-50 transition-all">
                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {selectedEmployee && (
                <EmployeeDrawer
                    employee={selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                    onSuccess={loadData}
                />
            )}

            <AddEmployeeModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={loadData}
            />
        </div>
    )
}
