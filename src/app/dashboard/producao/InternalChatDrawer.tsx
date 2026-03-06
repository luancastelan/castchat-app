'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Bot, MessageSquareText } from 'lucide-react'
import type { InternalMessage, Conversation } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sendInternalMessage } from './actions'

interface Props {
    os: Conversation
    isOpen: boolean
    onClose: () => void
    currentUser: { id: string, name: string }
}

export function InternalChatDrawer({ os, isOpen, onClose, currentUser }: Props) {
    const [messages, setMessages] = useState<(InternalMessage & { users?: { name: string } })[]>([])
    const [inputValue, setInputValue] = useState('')
    const [loading, setLoading] = useState(false)
    const endOfMessagesRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        if (!isOpen) return

        const fetchChat = async () => {
            const { data } = await supabase
                .from('internal_messages')
                .select('*, users(name)')
                .eq('conversation_id', os.id)
                .order('created_at', { ascending: true })

            if (data) setMessages(data)
            scrollToBottom()
        }

        fetchChat()

        const channel = supabase.channel(`internal_chat_${os.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'internal_messages',
                filter: `conversation_id=eq.${os.id}`
            }, async (payload) => {
                // Buscar o nome de quem mandou
                const msg = payload.new as InternalMessage
                if (msg.sender_user_id) {
                    const { data: userData } = await supabase.from('users').select('name').eq('id', msg.sender_user_id).single()
                    setMessages(prev => [...prev, { ...msg, users: userData || undefined }])
                } else {
                    setMessages(prev => [...prev, { ...msg, users: { name: 'Mestre IA (Fábrica)' } }])
                }
                scrollToBottom()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [isOpen, os.id, supabase])

    const scrollToBottom = () => {
        setTimeout(() => {
            endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim()) return

        setLoading(true)
        const content = inputValue
        setInputValue('')

        // Optimistic UI
        const tempMsg = {
            id: Math.random().toString(),
            tenant_id: os.tenant_id,
            conversation_id: os.id,
            sender_user_id: currentUser.id,
            content: content,
            created_at: new Date().toISOString(),
            users: { name: currentUser.name }
        }
        setMessages(prev => [...prev, tempMsg])
        scrollToBottom()

        const res = await sendInternalMessage(os.id, content)
        if (res.error) {
            alert("Erro ao enviar: " + res.error)
            setInputValue(content)
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        }
        setLoading(false)
    }

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={onClose} />
            )}

            <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white shrink-0">
                    <div>
                        <h3 className="font-semibold flex items-center gap-2">
                            <MessageSquareText className="w-5 h-5" />
                            Notas de Produção
                        </h3>
                        <p className="text-xs text-blue-100 mt-0.5">O.S: {os.client_name || os.client_number} - {os.service_type || 'Sem Serviço'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mensagens feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-3">
                            <Bot className="w-12 h-12 text-gray-300" />
                            <p className="text-sm">O Chat Interno desta OS está vazio.<br />Os funcionários e a IA podem debater este projeto aqui.</p>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isMe = msg.sender_user_id === currentUser.id
                        const isAI = !msg.sender_user_id

                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-gray-400 font-medium mb-1 px-1">
                                    {isAI ? '🤖 Mestre IA' : msg.users?.name || 'Funcionário'}
                                </span>
                                <div className={`
                                    max-w-[85%] p-3 rounded-2xl text-sm shadow-sm
                                    ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' :
                                        isAI ? 'bg-purple-100 text-purple-900 border border-purple-200 rounded-tl-sm' :
                                            'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'}
                                `}>
                                    {msg.content}
                                </div>
                                <span className="text-[9px] text-gray-400 mt-1 px-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )
                    })}
                    <div ref={endOfMessagesRef} />
                </div>

                {/* Input Formulário */}
                <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                    <form onSubmit={handleSend} className="flex gap-2 relative">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Mandar mensagem p/ Equipe..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputValue.trim()}
                            className="absolute right-1.5 top-1.5 bottom-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </form>
                </div>
            </div>
        </>
    )
}
