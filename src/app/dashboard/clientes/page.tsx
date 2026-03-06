'use client'

import { useState, useEffect } from 'react'
import { getClients } from './actions'
import { Plus, Search, Calendar, Phone, DollarSign } from 'lucide-react'
import { Client } from '@/types/database'
import { ClientProfileDrawer } from './ClientProfileDrawer'
import { NewClientModal } from './NewClientModal'

export default function ClientesPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [error, setError] = useState<string | null>(null)
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false)

    useEffect(() => {
        loadClients()
    }, [])

    const loadClients = async () => {
        const res = await getClients()
        if (res.error) setError(res.error)
        else setClients(res.data || [])
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            <div className="flex-1 bg-gray-50/50 flex flex-col min-w-0 border-l border-gray-200">
                {/* Cabeçalho */}
                <div className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-gray-900">Base de Clientes</h2>
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {clients?.length || 0} Contatos
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou número..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                            />
                        </div>

                        <button
                            onClick={() => setIsNewClientModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Cliente
                        </button>
                    </div>
                </div>

                {/* Área da Tabela */}
                <div className="flex-1 overflow-auto p-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl mb-6">
                            Erro ao carregar clientes: {error}
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                    <th className="px-6 py-4">Nome Oficial</th>
                                    <th className="px-6 py-4">Telefone (WhatsApp)</th>
                                    <th className="px-6 py-4 text-right">LTV (Gasto Acumulado)</th>
                                    <th className="px-6 py-4">Entrou Em</th>
                                    <th className="px-6 py-4">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {clients?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                Nenhum cliente chamou no WhatsApp até agora.
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    clients?.map((client) => (
                                        <tr
                                            key={client.id}
                                            onClick={() => setSelectedClient(client)}
                                            className="hover:bg-gray-50/50 cursor-pointer group transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                        {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                            {client.name || 'Desconhecido'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">Base de WhatsApp</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                {client.phone_number}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 text-right font-semibold">
                                                R$ {client.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(client.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:border-blue-500 hover:text-blue-600 font-medium shadow-sm transition-all focus:ring-2 focus:ring-blue-100">
                                                    Ver Ficha
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedClient && (
                <ClientProfileDrawer
                    client={selectedClient}
                    onClose={() => {
                        setSelectedClient(null)
                        loadClients() // refresh em caso de nota salva
                    }}
                />
            )}

            {isNewClientModalOpen && (
                <NewClientModal
                    onClose={() => setIsNewClientModalOpen(false)}
                    onSuccess={loadClients}
                />
            )}
        </div>
    )
}
