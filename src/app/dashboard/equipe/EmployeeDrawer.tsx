'use client'

import { useState } from 'react'
import { X, UserCog, Lock, Bot, Save, AlertCircle } from 'lucide-react'
import { User } from '@/types/database'
import { updateEmployeeAIPermissions } from './actions'

interface EmployeeDrawerProps {
    employee: User
    onClose: () => void
    onSuccess: () => void
}

export function EmployeeDrawer({ employee, onClose, onSuccess }: EmployeeDrawerProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form Stats
    const [role, setRole] = useState(employee.role)
    const [phone, setPhone] = useState(employee.business_phone || '')
    const [instructions, setInstructions] = useState(employee.ai_instructions || '')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        const res = await updateEmployeeAIPermissions({
            userId: employee.id,
            businessPhone: phone,
            aiInstructions: instructions,
            role: role
        })

        setIsLoading(false)

        if (res.error) {
            setError(res.error)
        } else {
            onSuccess()
            onClose()
        }
    }

    return (
        <div className="fixed inset-y-0 right-0 z-50 flex">
            {/* Overlay Escuro */}
            <div
                className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Painel Lateral */}
            <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0 border-l border-gray-100">
                {/* Cabeçalho */}
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shadow-sm">
                            {employee.name ? employee.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">Painel do Colaborador</h2>
                            <p className="text-sm text-gray-500">{employee.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Corpo do Drawer (Scroll) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <form id="rh-form" onSubmit={handleSubmit} className="space-y-6">

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium flex gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        {/* Bloco 1: Acesso de Sistema (Cargo) */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Lock className="w-4 h-4 text-gray-500" />
                                Segurança e Cargo do Sistema Web
                            </h3>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Permissão de Acesso</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as any)}
                                    className="w-full px-4 py-2.5 outline-none border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                >
                                    <option value="admin">Administrador (Proprietário)</option>
                                    <option value="manager">Gerente (Gestão Parcial)</option>
                                    <option value="employee">Funcionário Padrão (Sem Financeiro)</option>
                                </select>
                            </div>
                        </div>

                        {/* Bloco 2: Inteligência Artificial (A Mágica da Fase 10) */}
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-1">
                                <Bot className="w-4 h-4 text-blue-600" />
                                Escopo e Restrições da IA via Chat Pessoal
                            </h3>
                            <p className="text-xs text-blue-700/80 mb-4 font-medium">Configure como a Inteligência Artificial do 2º WhatsApp lidará com esta pessoa se o dono chamar.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-widest mb-2">Telefone com DDD (Biometria)</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Ex: 5511999999999"
                                        className="w-full px-4 py-2.5 outline-none border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">A IA usará este número para ler as regras abaixo. MPORTANTE: Ponha DDI 55 e código.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-widest mb-2">Poderes da IA / Regras</label>
                                    <textarea
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                        placeholder="Ex: O Cleyton é do setor de acabamento. Ele pdoe ver o estoque ou relatórios de faturamento. Mande que ele foque nas bandeiras..."
                                        className="w-full h-32 px-4 py-3 outline-none border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Escreva em texto livre o 'Prompt' restritivo que a IA de Gerenciamento vai adotar para interagir com este(a) funcionário(a).</p>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Rodapé (Salvar) */}
                <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition"
                    >
                        Descartar
                    </button>
                    <button
                        type="submit"
                        form="rh-form"
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition shadow disabled:opacity-75 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isLoading ? 'Salvando...' : 'Aplicar Políticas'}
                    </button>
                </div>

            </div>
        </div>
    )
}
