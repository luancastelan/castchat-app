'use client'

import React, { useState, useEffect } from 'react'
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { ProductionStage, Conversation } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { ProductionColumn } from './ProductionColumn'
import { moveProductionCard } from './actions'
import { InternalChatDrawer } from './InternalChatDrawer'

interface ProductionBoardProps {
    initialStages: ProductionStage[]
    tenantId: string
    currentUser: { id: string, name: string, role: string }
}

export function ProductionBoard({ initialStages, tenantId, currentUser }: ProductionBoardProps) {
    const [stages, setStages] = useState<ProductionStage[]>(initialStages)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [chatOs, setChatOs] = useState<Conversation | null>(null)
    const supabase = createClient()

    // 1. Carregamento Inicial das Conversas Físicas (Onde production_stage_id não é nulo ou onde a venda finalizou e caiu pra fabrica)
    // Para simplificar no CastChat Phase 3: Vamos puxar conversas que tenham production_stage_id. 
    // Uma Venda vira "Produção" quando o comercial assinala o stage inicial dela como "Design (Fila)".
    const fetchConversations = async () => {
        const { data } = await supabase
            .from('conversations')
            .select('*')
            .eq('tenant_id', tenantId)
            .not('production_stage_id', 'is', null)

        if (data) setConversations(data)
    }

    useEffect(() => {
        fetchConversations()

        // 2. Realtime Subscriptions exclusivas para Fábrica
        const channel = supabase.channel('production_board_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations', filter: `tenant_id=eq.${tenantId}` },
                (payload) => {
                    const changedConv = payload.new as Conversation
                    // Se a conversa tem estágio de produção, nós adicionamos/atualizamos no board
                    if (changedConv.production_stage_id) {
                        setConversations(prev => {
                            const exists = prev.find(c => c.id === changedConv.id)
                            if (exists) return prev.map(c => c.id === changedConv.id ? changedConv : c)
                            return [...prev, changedConv]
                        })
                        // Update chatSeletion in real time 
                        setChatOs(prev => (prev?.id === changedConv.id) ? changedConv : prev)
                    } else {
                        // Se perdeu o estágio de produção (venda estornada talvez?), tiramos do board
                        setConversations(prev => prev.filter(c => c.id !== changedConv.id))
                        setChatOs(prev => (prev?.id === changedConv.id) ? null : prev)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tenantId, supabase])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // overId é o ID do Estágio ALVO.
        // Se soltou na própria coluna que estava, ignorar.
        const draggedCard = conversations.find(c => c.id === activeId)
        if (!draggedCard || draggedCard.production_stage_id === overId) return

        // Mover Optimisticamente UI
        setConversations(prev => prev.map(c =>
            c.id === activeId ? { ...c, production_stage_id: overId } : c
        ))

        // Gravar no Banco via Server Action
        const res = await moveProductionCard(activeId, overId)
        if (res.error) {
            // Revert Optimistic Update se deu BO
            fetchConversations()
            alert('Falha ao mover na fábrica: ' + res.error)
        }
    }

    const dropAnimationConfig = {
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
    }

    return (
        <div className="flex h-full min-h-[70vh] gap-6 w-max p-2 pb-8">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {stages.map((stage) => {
                    const columnConvs = conversations.filter(c => c.production_stage_id === stage.id)

                    return (
                        <ProductionColumn
                            key={stage.id}
                            stage={stage}
                            conversations={columnConvs}
                            isActive={activeId !== null}
                            onCardClick={setChatOs}
                            currentUser={currentUser}
                        />
                    )
                })}

                {currentUser.role === 'admin' && (
                    <div className="w-80 shrink-0 select-none">
                        <button
                            onClick={async () => {
                                const name = window.prompt("Nome do novo Setor da Fábrica:")
                                if (name && name.trim()) {
                                    const { addProductionStage } = await import('./actions')
                                    const res = await addProductionStage(name.trim())
                                    if (res?.error) alert("Erro: " + res.error)
                                    else window.location.reload()
                                }
                            }}
                            className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-all font-medium text-sm"
                        >
                            + Adicionar Setor
                        </button>
                    </div>
                )}
            </DndContext>

            {chatOs && (
                <InternalChatDrawer
                    os={chatOs}
                    isOpen={!!chatOs}
                    onClose={() => setChatOs(null)}
                    currentUser={currentUser}
                />
            )}
        </div>
    )
}
