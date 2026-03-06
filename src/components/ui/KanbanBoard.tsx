'use client'

import { useState, useEffect } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { ChatDrawer } from './ChatDrawer'
import type { PipelineStage, Conversation, Message } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface KanbanBoardProps {
    stages: PipelineStage[]
    initialConversations: Conversation[]
}

export function KanbanBoard({ stages, initialConversations }: KanbanBoardProps) {
    const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
    const [chatOpenConv, setChatOpenConv] = useState<Conversation | null>(null)
    const [chatMessages, setChatMessages] = useState<Message[]>([])
    const supabase = createClient()

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Ajuda a distinguir clique de arrasto
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const onDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Conversation') {
            setActiveConversation(event.active.data.current.conversation)
        }
    }

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id

        if (activeId === overId) return

        const isActiveAConversation = active.data.current?.type === 'Conversation'
        const isOverAColumn = over.data.current?.type === 'Column'

        // Estamos movendo entre colunas, então precisamos atualizar o state do client pra interface não ficar tremendo (optimistic update)
        if (isActiveAConversation && isOverAColumn) {
            setConversations(prev => {
                const activeIndex = prev.findIndex(c => c.id === activeId)
                if (activeIndex === -1) return prev

                const newConversations = [...prev]
                newConversations[activeIndex].stage_id = String(overId)
                return newConversations
            })
        }
    }

    const onDragEnd = async (event: DragEndEvent) => {
        setActiveConversation(null)

        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id

        const isActiveAConversation = active.data.current?.type === 'Conversation'

        if (isActiveAConversation) {
            const isOverAColumn = over.data.current?.type === 'Column'
            const newStageId = isOverAColumn ? String(overId) : String(over.data.current?.conversation?.stage_id)

            const conversationToMove = conversations.find(c => c.id === activeId)

            // Update the DB se movido
            if (conversationToMove && conversationToMove.stage_id !== newStageId) {
                setConversations(prev => {
                    return prev.map(c => c.id === activeId ? { ...c, stage_id: newStageId } : c)
                })

                // Descobrir qual status o Card deve assumir baseado na ordem da coluna 
                const targetColumn = stages.find(s => s.id === newStageId)
                let newEnumStatus: Conversation['status'] = conversationToMove.status
                if (targetColumn) {
                    if (targetColumn.order === 1) newEnumStatus = 'bot'
                    else if (targetColumn.order === 2) newEnumStatus = 'designer'
                    else if (targetColumn.order === 3) newEnumStatus = 'aguardando_cliente'
                    else if (targetColumn.order === 4) newEnumStatus = 'aguardando_cliente'
                }

                // Atualizar DB Simultaneamente (Coluna e Motor da IA)
                const { error } = await supabase
                    .from('conversations')
                    .update({ stage_id: newStageId, status: newEnumStatus })
                    .eq('id', activeId)

                if (error) {
                    console.error("Falha ao atualizar Kanban", error)
                    // Reverta em caso de erro na prod. (Aqui ignoramos pra manter simples o MVP)
                }
            }
        }
    }

    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)

        // WebSockets para ouvir as MENSAGENS E CONVERSAS novas enviadas pelo Webhook
        const channel = supabase.channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                (payload) => {
                    // Refetch simple pra MVP
                    supabase.from('conversations').select('*')
                        .then(({ data }) => {
                            if (data) setConversations(data)
                        })
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    // Atualiza a gaveta de chat caso esteja aberta na mesma conversa
                    setChatOpenConv(currentOpen => {
                        if (currentOpen && payload.new.conversation_id === currentOpen.id) {
                            setChatMessages(prev => [...prev, payload.new as Message])
                        }
                        return currentOpen;
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (!isMounted) {
        return <div className="w-full h-full flex items-center justify-center p-6 text-gray-500">Carregando CRM...</div>
    }

    return (
        <DndContext
            id="kanban-board-dnd"
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
        >
            <div className="flex w-full h-full gap-6 overflow-x-auto pb-4 custom-scrollbar">
                {stages.sort((a, b) => a.order - b.order).map(stage => {
                    const stageConversations = conversations.filter(c => c.stage_id === stage.id)
                    return (
                        <div key={stage.id} onClick={(e) => {
                            const card = (e.target as HTMLElement).closest('[data-dnd-card-id]')
                            if (card) {
                                const id = card.getAttribute('data-dnd-card-id')
                                const conv = conversations.find(c => c.id === id)
                                if (conv) {
                                    setChatOpenConv(conv)
                                    supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true })
                                        .then(({ data }) => setChatMessages(data || []))
                                }
                            }
                        }}>
                            <KanbanColumn
                                stage={stage}
                                conversations={stageConversations}
                            />
                        </div>
                    )
                })}
            </div>

            <DragOverlay>
                {activeConversation ? <KanbanCard conversation={activeConversation} /> : null}
            </DragOverlay>

            {chatOpenConv && (
                <ChatDrawer
                    conversation={chatOpenConv}
                    messages={chatMessages}
                    onClose={() => setChatOpenConv(null)}
                />
            )}
        </DndContext>
    )
}
