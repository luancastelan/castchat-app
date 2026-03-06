'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Conversation } from '@/types/database'
import { MessageSquare, Clock, User } from 'lucide-react'

interface KanbanCardProps {
    conversation: Conversation
}

export function KanbanCard({ conversation }: KanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: conversation.id,
        data: {
            type: 'Conversation',
            conversation,
        },
    })

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="w-full bg-blue-50 border-2 border-blue-400 border-dashed p-3 opacity-50 h-16"
            />
        )
    }

    // Identificar tempo decorrido desde a última mensagem
    const timeAgo = formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: ptBR })
    const isDelayed = new Date().getTime() - new Date(conversation.last_message_at).getTime() > 60 * 60 * 1000 // Mais de 1h sem resposta

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            data-dnd-card-id={conversation.id}
            className={`w-full flex items-center gap-3 bg-white border-b last:border-b-0 ${isDelayed ? 'border-l-4 border-l-red-500 bg-red-50/20 animate-pulse' : 'border-l-4 border-l-transparent'} hover:bg-gray-50 transition-colors p-3 cursor-grab active:cursor-grabbing group relative select-none`}
        >
            {/* Avatar Simulado */}
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm
                ${conversation.status === 'bot' ? 'bg-purple-100 text-purple-700' :
                    conversation.status === 'designer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}
            `}>
                {conversation.client_name ? conversation.client_name.charAt(0).toUpperCase() : '#'}
            </div>

            {/* Conteúdo Info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-sm font-semibold text-gray-900 truncate pr-2">
                        {conversation.client_name || conversation.client_number}
                    </h4>
                    <span className={`text-[10px] whitespace-nowrap font-medium ${isDelayed ? 'text-red-600' : 'text-gray-400'}`}>
                        {timeAgo}
                    </span>
                </div>

                <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                        {conversation.client_number}
                    </p>

                    <div className="flex items-center gap-1.5">
                        {isDelayed && conversation.status !== 'fechado' && (
                            <Clock className="w-3 h-3 text-red-500" />
                        )}
                        {conversation.assigned_user_id ? (
                            <span title="Atendido Humano"><User className="w-3.5 h-3.5 text-blue-400" /></span>
                        ) : (
                            <span title="Aguardando"><MessageSquare className="w-3.5 h-3.5 text-gray-300" /></span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
