'use server'

import { createClient } from '@/lib/supabase/server'
import { generateAiResponse } from '@/lib/ai/service'
import { revalidatePath } from 'next/cache'

export async function sendMessage(formData: FormData) {
    const supabase = await createClient()
    const content = formData.get('message') as string
    const conversationId = formData.get('conversation_id') as string

    if (!content || !conversationId) return { error: "Mensagem vazia" }

    // 1. Buscando o Telefone do Cliente na Conversa
    const { data: convData, error: convErr } = await supabase.from('conversations').select('client_number, tenant_id').eq('id', conversationId).single()

    if (convErr || !convData) return { error: "Conversa não encontrada." }

    // 2. Salvar MSG do HUMANO/ATENDENTE no banco
    const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender: 'user', // Agora é Oficialmente o Humano interagindo
        content: content
    })

    if (insertError) return { error: insertError.message }

    // 3. Pegar os dados da API da Evolution
    const evolutionApiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
    const evolutionApiKey = process.env.EVOLUTION_API_KEY
    const evolutionInstance = `tenant-${convData.tenant_id}`

    // 4. Mudar o status da Conversa para dizer que o Humano assumiu o ticket (se estava em Bot)
    await supabase.from('conversations').update({
        status: 'designer', // Status manual
        last_message_at: new Date().toISOString()
    }).eq('id', conversationId)

    // 5. O Grande Disparo para o WhatsApp da Vida Real (Ativado)
    if (evolutionApiUrl && evolutionInstance && evolutionApiKey) {
        try {
            const req = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstance}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': evolutionApiKey
                },
                body: JSON.stringify({
                    number: convData.client_number,
                    text: content
                })
            })
            if (!req.ok) console.error("Falha ao Enviar WPP:", await req.text())
        } catch (e) {
            console.error("Erro disparo WPP Evolution:", e)
        }
    }

    // Refresh dashboard 
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function sendToProduction(
    conversationId: string,
    metadata?: { service_type: string, client_type: string, delivery_date: string }
) {
    const supabase = await createClient()

    if (!conversationId) return { error: "Sem conversa" }

    // Pega o Estagio numero 1 da Producao desse Tenant
    const { data: convData } = await supabase.from('conversations').select('tenant_id, production_stage_id').eq('id', conversationId).single()
    if (!convData) return { error: "Conversa não achada no banco" }

    if (convData.production_stage_id) {
        return { error: 'O Projeto já está na fila de Produção!' }
    }

    const { data: firstStage } = await supabase
        .from('production_stages')
        .select('id')
        .eq('tenant_id', convData.tenant_id)
        .order('order', { ascending: true })
        .limit(1)
        .single()

    if (!firstStage) return { error: "Chão de Fábrica não configurado para essa empresa" }

    const updatePayload: any = { production_stage_id: firstStage.id }
    if (metadata) {
        updatePayload.service_type = metadata.service_type
        updatePayload.client_type = metadata.client_type
        updatePayload.delivery_date = metadata.delivery_date
    }

    const { error } = await supabase
        .from('conversations')
        .update(updatePayload)
        .eq('id', conversationId)

    if (error) return { error: error.message }

    revalidatePath('/dashboard', 'layout')
    revalidatePath('/dashboard/producao', 'layout')
    return { success: true }
}
