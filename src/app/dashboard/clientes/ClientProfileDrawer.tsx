'use client'

import { useState } from 'react'
import { X, Send, UserRound, Phone, Save, History, TrendingUp } from 'lucide-react'
import { Client } from '@/types/database'
import { updateClientNotes, createOutboundConversation } from './actions'
import { useRouter } from 'next/navigation'

interface ClientProfileDrawerProps {
    client: Client
    onClose: () => void
}

export function ClientProfileDrawer({ client, onClose }: ClientProfileDrawerProps) {
    const [notes, setNotes] = useState(client.notes || '')
    const [isSaving, setIsSaving] = useState(false)
    const [isCalling, setIsCalling] = useState(false)
    const router = useRouter()

    const handleSaveNotes = async () => {
        setIsSaving(true)
        const res = await updateClientNotes(client.id, notes)
        if (res.success) {
            // Sucesso visual rapido (opcional)
        }
        setIsSaving(false)
    }

    const handleCallClient = async () => {
        setIsCalling(true)
        const res = await createOutboundConversation(client.id, client.phone_number, client.name)
        setIsCalling(false)
        if (res.success && res.conversationId) {
            // Redireciona a pessoa para a tela de Pipeline com o Chat aberto no lado esquerdo
            router.push(`/dashboard/producao?chat=${res.conversationId}`)
            onClose()
        } else {
            alert(res.error || 'Falha ao criar ticket do WhatsApp.')
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl shadow-inner">
                            {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">{client.name || 'Desconhecido'}</h2>
                            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5 font-medium">
                                <Phone className="w-3.5 h-3.5" /> {client.phone_number}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body scrollable */}
                <div className="flex-1 overflow-y-auto w-full p-6 space-y-8 bg-white">

                    {/* Botão de ATIVAÇÃO (Chamar no Celular Agora) */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
                        <div className="relative z-10 flex flex-col">
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-1">
                                <Send className="w-5 h-5" /> Iniciar Atendimento Ativo
                            </h3>
                            <p className="text-blue-100 text-sm mb-4">
                                Inicie uma nova conversa de WhatsApp com {client.name || 'este cliente'} abrindo um chamado no Pipeline.
                            </p>
                            <button
                                onClick={handleCallClient}
                                disabled={isCalling}
                                className="bg-white text-blue-600 font-bold py-2.5 px-4 rounded-lg hover:bg-blue-50 transition-colors shadow-sm self-start flex items-center gap-2 disabled:opacity-70"
                            >
                                {isCalling ? 'Montando Ticket...' : 'Chamar no WhatsApp'}
                            </button>
                        </div>
                    </div>

                    {/* Stats Financeiros */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-xl">
                            <div className="text-sm text-gray-500 font-medium flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                LTV (Gasto Total)
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                                R$ {client.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-xl">
                            <div className="text-sm text-gray-500 font-medium flex items-center gap-2 mb-1">
                                <UserRound className="w-4 h-4 text-blue-500" />
                                Cliente Desde
                            </div>
                            <div className="text-lg font-bold text-gray-900 mt-1">
                                {new Date(client.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Editor de Ficha do Cliente */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                            Anotações Fichadas / Prontuário
                        </h3>
                        <div className="relative">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Alergia a dipirona... Prefere entrega à tarde... Comprou adesivo mês passado..."
                                className="w-full h-40 p-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none shadow-sm text-sm"
                            />
                            <button
                                onClick={handleSaveNotes}
                                disabled={isSaving || notes === client.notes}
                                className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-0 disabled:pointer-events-none transition-all shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Estas notas são internas. O cliente e os robôs não enxergam este painel.
                        </p>
                    </div>

                </div>
            </div>
        </>
    )
}
