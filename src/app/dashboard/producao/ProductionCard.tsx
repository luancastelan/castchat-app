'use client'

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Conversation } from '@/types/database'
import { GripVertical, Clock, CheckCircle2, Factory } from 'lucide-react'

interface Props {
    conversation: Conversation
    onClick?: () => void
}

export function ProductionCard({ conversation, onClick }: Props) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: conversation.id,
        data: {
            type: 'Card',
            conversation,
        },
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.9 : 1,
    }

    const timeAgo = (dateStr: string | null) => {
        if (!dateStr) return 'Sem data'
        const diff = new Date().getTime() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        return mins < 60 ? `${mins}m atrás` : `${Math.floor(mins / 60)}h atrás`
    }

    const formatDelivery = (dateStr: string | null) => {
        if (!dateStr) return 'Sem Prazo'
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    }

    // Calcula se ta atrasado
    const isLate = conversation.delivery_date && new Date(conversation.delivery_date).getTime() < new Date().getTime()

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={onClick}
            className={`
                bg-white p-3.5 rounded-xl border flex flex-col gap-3 cursor-grab
                transition-all duration-200 shadow-sm
                ${isDragging ? 'shadow-lg border-blue-400 rotate-2' : 'border-gray-200 hover:shadow-md hover:border-gray-300'}
            `}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${conversation.client_type === 'prefeitura' ? 'bg-purple-100 text-purple-700' :
                            conversation.client_type === 'empresa' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>
                            {conversation.client_type || 'COMUM'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-gray-900 line-clamp-1">
                            {conversation.client_name || conversation.client_number}
                        </span>
                    </div>
                </div>
                <div
                    className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-grab active:cursor-grabbing bg-gray-50"
                >
                    <GripVertical className="w-4 h-4" />
                </div>
            </div>

            <div className="bg-gray-50 rounded p-2 border border-gray-100">
                <p className="text-xs text-gray-700 font-medium line-clamp-1" title={conversation.service_type || 'Serviço não especificado'}>
                    <span className="text-gray-400 font-normal mr-1">Serv:</span>{conversation.service_type || 'Mídia em Branco'}
                </p>
            </div>

            <div className="flex items-center justify-between text-xs font-medium mt-1">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isLate
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : 'bg-green-50 text-green-700 border-green-100'
                    }`}>
                    <Clock className="w-3.5 h-3.5" />
                    {formatDelivery(conversation.delivery_date)}
                </div>

                <div className="text-[10px] text-gray-400 font-mono">
                    #{conversation.id.slice(0, 5)}
                </div>
            </div>
        </div>
    )
}
