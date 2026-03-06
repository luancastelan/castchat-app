'use client'

import { useState, useEffect } from 'react'
import { createTenantWithTemplate } from './actions'
import { Store, Activity, AlertCircle, RefreshCw, Briefcase, PlusCircle, CheckCircle } from 'lucide-react'

export default function SuperAdminDashboard() {
    const [loading, setLoading] = useState(false)
    const [statusData, setStatusData] = useState<{ error?: string, success?: boolean, message?: string } | null>(null)

    // Form states
    const [tenantName, setTenantName] = useState('')
    const [ownerEmail, setOwnerEmail] = useState('')
    const [initialPassword, setInitialPassword] = useState('')
    const [businessType, setBusinessType] = useState('grafica')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setStatusData(null)

        const formData = new FormData()
        formData.append('tenantName', tenantName)
        formData.append('ownerEmail', ownerEmail)
        formData.append('businessType', businessType)
        formData.append('initialPassword', initialPassword)

        const result = await createTenantWithTemplate(formData)
        setStatusData(result)

        if (result.success) {
            setTenantName('')
            setOwnerEmail('')
            setInitialPassword('')
            setBusinessType('grafica')
        }

        setLoading(false)
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <Activity className="w-8 h-8 text-rose-600" />
                        CastChat Control Room
                    </h2>
                    <p className="text-gray-500 mt-2 font-medium">Você está na área secreta do Fundador. Cuidado com o que executa aqui.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CARD 1: FORMULÁRIO SETUP MÁGICO */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-rose-50 border-b border-rose-100 p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                            <PlusCircle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Setup Mágico (Fábrica de Lojistas)</h3>
                        <p className="text-sm text-gray-600 max-w-sm mt-1">Crie um Inquilino injetando nativamente os funis e IAs do nicho desejado.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {statusData?.error && (
                            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm">
                                <AlertCircle className="w-5 h-5" />
                                <b>Falha Crítica: </b>{statusData.error}
                            </div>
                        )}

                        {statusData?.success && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-3 text-sm">
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <b>Loja Injetada na Matrix!</b> <br /> {statusData.message} <br />
                                    <i>Aguarde aprovação de Auth para esse E-mail (Beta Bypass mode).</i>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nome Fantasia da Nova Empresa</label>
                            <input
                                type="text"
                                required
                                value={tenantName}
                                onChange={(e) => setTenantName(e.target.value)}
                                className="w-full border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:ring-rose-500 focus:border-rose-500 border bg-gray-50/50"
                                placeholder="Ex: Clínica Sorriso Metálico"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">E-mail do Proprietário</label>
                            <input
                                type="email"
                                required
                                value={ownerEmail}
                                onChange={(e) => setOwnerEmail(e.target.value)}
                                className="w-full border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:ring-rose-500 focus:border-rose-500 border bg-gray-50/50"
                                placeholder="dono@sorriso.com.br"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Senha de Acesso (Login do Lojista)</label>
                            <input
                                type="text"
                                required
                                minLength={6}
                                value={initialPassword}
                                onChange={(e) => setInitialPassword(e.target.value)}
                                className="w-full border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:ring-rose-500 focus:border-rose-500 border bg-white"
                                placeholder="Criar Senha de acesso (mín 6 dítigos)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Template Verticalizado (Nicho SaaS)</label>
                            <select
                                required
                                value={businessType}
                                onChange={(e) => setBusinessType(e.target.value)}
                                className="w-full border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:ring-rose-500 focus:border-rose-500 border bg-white font-medium"
                            >
                                <option value="clinica">🦷 Saúde: Clínicas & Consultórios</option>
                                <option value="restaurante">🍔 Fast-Food & Restaurantes</option>
                                <option value="advocacia">⚖️ Escritório de Advocacia</option>
                                <option value="grafica">🏭 Produção, Varejo & Oficinas (Genérico)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-2">Isto fará com que o sistema escreva no Supabase todos os Funis de Atendimento e crie a Recepcionista de IA perfeita para a categoria escolhida.</p>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Store className="w-5 h-5" />}
                                {loading ? 'Semeando Banco de Dados...' : 'Injetar Lojista na Plataforma'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* CARD 2: ESTATÍSTICAS OU DICAS (PLACEHOLDER PRO LÚAN) */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-xl border border-gray-800 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
                        <div className="relative z-10">
                            <Briefcase className="w-10 h-10 text-rose-400 mb-4" />
                            <h3 className="text-2xl font-bold mb-2">Visão Multi-Nível</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Você está no topo da pirâmide do SaaS. As lojas criadas pela ferramenta ao lado ganharão o respectivo "molde".
                                Por enquanto, você só consegue pular de loja em loja deslogando e logando no Auth, ou alterando o `tenant_id` da sua conta mãe na mão lá no Supabase.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
