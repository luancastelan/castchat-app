'use client'

import React, { useState } from 'react'
import { Phone } from 'lucide-react'
import { updateUserWhatsappNumber } from './actions'

export function UserProfileWhatsApp({ initialWhatsapp }: { initialWhatsapp?: string | null }) {
    const [whatsapp, setWhatsapp] = useState(initialWhatsapp || '')
    const [isSaving, setIsSaving] = useState(false)

    const handleEdit = async () => {
        const newNumber = window.prompt("Digite seu número do WhatsApp para ser notificado pelo Gerente IA (Ex: 5511999999999):", whatsapp)

        if (newNumber !== null && newNumber !== whatsapp) {
            setIsSaving(true)
            const cleanNumber = newNumber.replace(/\D/g, '') // remove tudo que nao eh digito
            const res = await updateUserWhatsappNumber(cleanNumber)
            if (res.error) {
                alert("Erro ao salvar: " + res.error)
            } else {
                setWhatsapp(cleanNumber)
                alert("Número atualizado! A IA saberá te marcar nos alertas de O.S da Fábrica.")
            }
            setIsSaving(false)
        }
    }

    return (
        <button
            onClick={handleEdit}
            disabled={isSaving}
            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group"
            title="Configurar seu WhatsApp de Recebimento de Alertas"
        >
            <span className="flex items-center gap-1.5 truncate">
                <Phone className="w-3.5 h-3.5 text-green-600" />
                {whatsapp ? `+${whatsapp}` : 'Vincular WhatsApp'}
            </span>
            <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">Editar</span>
        </button>
    )
}
