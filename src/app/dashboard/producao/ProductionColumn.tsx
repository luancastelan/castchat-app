'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Settings, Edit2, Trash2 } from 'lucide-react'
import type { ProductionStage, Conversation } from '@/types/database'
import { ProductionCard } from './ProductionCard'
import { updateWhatsappGroupId, deleteProductionStage, renameProductionStage } from './actions'

interface Props {
    stage: ProductionStage
    conversations: Conversation[]
    isActive: boolean
    onCardClick: (c: Conversation) => void
    currentUser?: { id: string, name: string, role: string }
}

export function ProductionColumn({ stage, conversations, isActive, onCardClick, currentUser }: Props) {
    const { isOver, setNodeRef } = useDroppable({
        id: stage.id,
        data: {
            type: 'Column',
            stage
        }
    })

    const isHovering = isOver || (isActive && conversations.length === 0)
    const isAdmin = currentUser?.role === 'admin'

    const handleConfigWhatsApp = async () => {
        const currentGroup = stage.whatsapp_group_id || ''
        const newGroup = window.prompt(`WhatsApp Group ID para o setor '${stage.name}':\nDeixe em branco para remover. Ex: 120363@g.us`, currentGroup)

        if (newGroup !== null && newGroup !== currentGroup) {
            const res = await updateWhatsappGroupId(stage.id, newGroup.trim())
            if (res.error) alert('Erro: ' + res.error)
            else alert('Grupo configurado! A página precisa ser atualizada para refletir as mudanças visuais.')
        }
    }

    const handleDelete = async () => {
        if (window.confirm(`Você tem certeza absoluta que deseja EXCLUIR o setor '${stage.name}'?`)) {
            const res = await deleteProductionStage(stage.id)
            if (res?.error) alert("Erro: " + res.error)
            else window.location.reload()
        }
    }

    const handleRename = async () => {
        const newName = window.prompt(`Novo nome para '${stage.name}':`, stage.name)
        if (newName && newName.trim() !== stage.name) {
            const res = await renameProductionStage(stage.id, newName.trim())
            if (res?.error) alert("Erro: " + res.error)
            else window.location.reload()
        }
    }

    return (
        <div
            className="flex flex-col bg-gray-50/80 rounded-2xl w-80 shrink-0 border border-gray-200 overflow-hidden"
            ref={setNodeRef}
        >
            {/* Header da Coluna */}
            <div className={`p-4 border-b transition-colors ${isHovering ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 items-center w-full min-w-0 pr-2">
                        <h3 className={`font-semibold text-sm truncate ${isHovering ? 'text-blue-800' : 'text-gray-800'}`}>
                            {stage.name}
                        </h3>

                        {isAdmin && (
                            <div className="flex items-center gap-0.5 ml-auto shrink-0 transition-opacity">
                                <button
                                    onClick={handleConfigWhatsApp}
                                    className={`p-1.5 rounded-md transition-colors ${stage.whatsapp_group_id ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                    title={stage.whatsapp_group_id ? `Conectado ao Zap Group: ${stage.whatsapp_group_id}` : 'Configurar Alertas Evolution WhatsApp'}
                                >
                                    <Settings className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={handleRename}
                                    className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                    title="Renomear Setor"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    title="Apagar este Setor"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                    <span className={`text-xs ml-auto font-bold px-2 py-1 rounded-full shrink-0 ${isHovering ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {conversations.length}
                    </span>
                </div>
                {/* Indicador de Ordem/Passo */}
                <div className="w-full h-1 bg-gray-100 rounded-full mt-3 overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(stage.order / 5) * 100}%` }}
                    />
                </div>
            </div>

            {/* Area de Drop dos Cards */}
            <div className={`flex-1 p-3 overflow-y-auto min-h-[150px] flex flex-col gap-3 transition-colors ${isHovering ? 'bg-blue-50/30' : ''}`}>
                {conversations.map((conv) => (
                    <ProductionCard key={conv.id} conversation={conv} onClick={() => onCardClick(conv)} />
                ))}

                {conversations.length === 0 && (
                    <div className="h-full flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl m-2 bg-gray-50/50">
                        <p className="text-xs text-center font-medium text-gray-400">Solte um projeto aqui</p>
                    </div>
                )}
            </div>
        </div>
    )
}
