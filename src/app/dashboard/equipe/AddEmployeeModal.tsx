'use client'

import { useState } from 'react'
import { PlusCircle, Shield, X, Mail, Lock, User as UserIcon } from 'lucide-react'
import { createEmployeeAuth } from './actions'

interface AddEmployeeModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function AddEmployeeModal({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // States do Formulário
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('employee')

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('name', name)
        formData.append('email', email)
        formData.append('password', password)
        formData.append('role', role)

        const result = await createEmployeeAuth(formData)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            setLoading(false)
            onSuccess() // Recarrega a grid do pai
            onClose()   // Fecha modal
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-blue-600" />
                        Cadastrar Funcionário
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nome do Colaborador</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text" required
                                value={name} onChange={e => setName(e.target.value)}
                                className="pl-10 w-full border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="João da Silva"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">E-mail de Acesso (Login)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="email" required
                                value={email} onChange={e => setEmail(e.target.value)}
                                className="pl-10 w-full border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="joao@empresa.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Senha Provisória</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text" required minLength={6}
                                value={password} onChange={e => setPassword(e.target.value)}
                                className="pl-10 w-full border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Minimo 6 dígitos (Ex: mudar123)"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nível de Permissão Sistêmica</label>
                        <div className="relative border border-gray-200 rounded-lg p-1 bg-gray-50/50">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Shield className="h-4 w-4 text-gray-400" />
                            </div>
                            <select
                                required
                                value={role} onChange={e => setRole(e.target.value)}
                                className="pl-9 w-full bg-transparent p-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-0"
                            >
                                <option value="employee">Funcionário Padrão (Vê apenas sua produção)</option>
                                <option value="manager">Gerência (Acesso Analítico Limitado)</option>
                                <option value="admin">Administrador (Poder Absoluto na Loja)</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-colors flex items-center flex-1 justify-center disabled:opacity-70"
                        >
                            {loading ? 'Gerando Conta...' : 'Criar Conta e Acesso'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
