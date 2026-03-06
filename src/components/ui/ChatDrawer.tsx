'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Factory } from 'lucide-react'
import type { Message, Conversation } from '@/types/database'
import { sendMessage, sendToProduction } from '@/app/dashboard/chat/actions'

interface ChatDrawerProps {
    conversation: Conversation | null
    messages: Message[]
    onClose: () => void
}

export function ChatDrawer({ conversation, messages, onClose }: ChatDrawerProps) {
    const [loading, setLoading] = useState(false)
    const [isSendingToFactory, setIsSendingToFactory] = useState(false)
    const [showFactoryForm, setShowFactoryForm] = useState(false)
    const [inputValue, setInputValue] = useState('')

    // Dados da O.S Fila Fabrica
    const [serviceType, setServiceType] = useState('')
    const [clientType, setClientType] = useState('comum')
    const [deliveryDate, setDeliveryDate] = useState('')

    const formRef = useRef<HTMLFormElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    if (!conversation) return null

    const handleSend = async (formData: FormData) => {
        setLoading(true)
        setInputValue('')
        await sendMessage(formData)
        setLoading(false)
    }

    const confirmSendToFactory = async () => {
        if (!serviceType || !deliveryDate) {
            alert("Preencha o Tipo de Serviço e o Prazo!")
            return
        }

        setIsSendingToFactory(true)
        // Passando os novos metadados da OS
        const res = await sendToProduction(conversation.id, {
            service_type: serviceType,
            client_type: clientType,
            delivery_date: new Date(deliveryDate).toISOString()
        })

        setIsSendingToFactory(false)
        if (res.error) {
            alert("Falha: " + res.error)
        } else {
            alert("O.S roteada para a Fábrica com sucesso!")
            setShowFactoryForm(false)
        }
    }

    return (
        <>
            {/* OVERLAY */}
            <div
                className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal de OS (Dentro do Drawer, Z-INDEX superior) */}
            {showFactoryForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-semibold text-gray-900">Gerar O.S de Produção</h3>
                            <button onClick={() => setShowFactoryForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo do Serviço</label>
                            <input
                                type="text" placeholder="Ex: Panfleto 10x15, Lona 4x2"
                                className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={serviceType} onChange={(e) => setServiceType(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Perfil do Cliente</label>
                            <select
                                className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={clientType} onChange={(e) => setClientType(e.target.value)}
                            >
                                <option value="comum">Cliente Comum (PF / End-User)</option>
                                <option value="empresa">Empresa / Terceirizado</option>
                                <option value="prefeitura">Poder Público (Prefeitura/Gov)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Prazo de Entrega Acordado</label>
                            <input
                                type="datetime-local"
                                className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                            />
                        </div>

                        <button
                            disabled={isSendingToFactory}
                            onClick={confirmSendToFactory}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2.5 rounded-lg mt-2 disabled:opacity-50 transition-colors"
                        >
                            {isSendingToFactory ? 'Enviando OS...' : 'Lançar P/ Chão de Fábrica'}
                        </button>
                    </div>
                </div>
            )}

            {/* DRAWER */}
            <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform border-l border-gray-200 ${showFactoryForm ? 'blur-sm pointer-events-none' : ''}`}>

                {/* HEADER */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-10">
                    <div>
                        <h3 className="font-semibold text-gray-900">{conversation.client_name || conversation.client_number}</h3>
                        <p className="text-xs text-gray-400">Status: <span className="text-blue-600 font-medium capitalize">{conversation.status}</span></p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFactoryForm(true)}
                            disabled={isSendingToFactory || !!conversation.production_stage_id}
                            title="Aprovar e Mandar pra Fábrica"
                            className="p-2 bg-gray-50 hover:bg-green-600 text-gray-500 hover:text-white rounded-full transition-colors disabled:opacity-50"
                        >
                            <Factory className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* MENSAGENS FEED */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] bg-opacity-20 custom-scrollbar relative pb-10">
                    {messages.length === 0 && (
                        <div className="text-center bg-yellow-50 text-yellow-700 py-3 rounded-xl text-sm opacity-80 border border-yellow-200 shadow-sm mx-4">
                            Esta é uma conversa nova. Use o painel abaixo para enviar uma mensagem simulada como se fosse o cliente ou responda como atendente.
                        </div>
                    )}

                    {messages.map(msg => {
                        const isClient = msg.sender === 'client'
                        const isBot = msg.sender === 'bot'
                        const isUser = msg.sender === 'user'

                        return (
                            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : isBot ? 'justify-start ml-4' : 'justify-start'}`}>
                                <div className={`relative max-w-[85%] rounded-2xl p-3 shadow-sm ${isBot
                                    ? 'bg-blue-100 text-blue-900 rounded-tl-sm border border-blue-200/50'
                                    : isUser
                                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                                        : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                                    }`}>
                                    {isBot && <p className="text-[10px] text-blue-600/70 uppercase font-black tracking-wider mb-1">🤖 Inteligência Artificial</p>}
                                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <span className={`text-[10px] flex justify-end mt-1 opacity-60 ${isUser ? 'text-white' : 'text-gray-500'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                    {loading && (
                        <div className="flex justify-end">
                            <div className="bg-blue-100 rounded-2xl rounded-tr-sm p-4 w-16 flex items-center justify-center space-x-1 shadow-sm border border-blue-200/50">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* IMPUT DE TEXTO SIMULADOR */}
                <div className="p-4 bg-white border-t border-gray-200">
                    <div className="text-xs text-center text-gray-400 mb-2 uppercase tracking-wide font-semibold">
                        Modo Simulador
                    </div>
                    <form action={handleSend} ref={formRef} className="flex gap-2 relative">
                        <input type="hidden" name="conversation_id" value={conversation.id} />
                        <input
                            type="text"
                            name="message"
                            autoComplete="off"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder="Digite como Cliente Whatsapp..."
                            className="flex-1 bg-gray-100 border-none rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputValue.trim()}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-full flex items-center justify-center transition-colors hover:shadow-md"
                        >
                            <Send className="w-5 h-5 -ml-1" />
                        </button>
                    </form>
                    <p className="text-[10px] text-gray-400 text-center mt-3">A IA da Groq vai absorver isso e auto-responder com a [Action:Designer] caso classifique orçamento com medidas.</p>
                </div>
            </div>
        </>
    )
}
