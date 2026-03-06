'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { PipelineStage, Conversation } from '@/types/database'
import { KanbanCard } from './KanbanCard'

interface KanbanColumnProps {
    stage: PipelineStage
    conversations: Conversation[]
}

export function KanbanColumn({ stage, conversations }: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({
        id: stage.id,
        data: {
            type: 'Column',
            stage,
        }
    })

    // Ordenar conversas pelas com mensagem mais recente
    const sortedConversations = [...conversations].sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )

    const itemIds = sortedConversations.map(c => c.id)

    return (
        <div className="flex-shrink-0 w-80 bg-white rounded-lg flex flex-col h-full border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-sm text-gray-800 uppercase tracking-wide">{stage.name}</h3>
                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-md">
                    {conversations.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-white min-h-[150px]"
            >
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {sortedConversations.map((conversation) => (
                        <KanbanCard key={conversation.id} conversation={conversation} />
                    ))}
                </SortableContext>
            </div>
        </div>
    )
}
