'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function moveProductionCard(conversationId: string, newProductionStageId: string | null) {
    const supabase = await createClient()

    // Validação básica
    if (!conversationId) {
        return { error: 'ID da conversa é obrigatório' }
    }

    try {
        const { error } = await supabase
            .from('conversations')
            .update({
                production_stage_id: newProductionStageId
            })
            .eq('id', conversationId)

        if (error) {
            console.error('Erro no banco ao mover card de produção:', error)
            return { error: error.message }
        }

        // Revalidar as páginas que exibem Kanban
        revalidatePath('/dashboard/producao')

        return { success: true }
    } catch (err: any) {
        console.error('Erro critico ao mover card de produção:', err)
        return { error: err.message }
    }
}

export async function sendInternalMessage(conversationId: string, content: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autorizado' }

    const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
    if (!userData) return { error: 'Tenant não encontrado' }

    if (!content.trim()) return { error: 'Mensagem vazia' }

    const { error } = await supabase
        .from('internal_messages')
        .insert({
            tenant_id: userData.tenant_id,
            conversation_id: conversationId,
            sender_user_id: user.id,
            content: content
        })

    if (error) {
        console.error('Erro ao enviar mensagem interna:', error)
        return { error: error.message }
    }


    // Nao precisamos invalidar cache porque a leitura da UI eh Realtime via JS
    return { success: true }
}

export async function updateWhatsappGroupId(stageId: string, groupId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autorizado' }

    const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
    if (!userData) return { error: 'Tenant não encontrado' }

    const { error } = await supabase
        .from('production_stages')
        .update({ whatsapp_group_id: groupId })
        .eq('id', stageId)
        .eq('tenant_id', userData.tenant_id)

    if (error) {
        console.error('Erro ao atualizar ID do Grupo WhatsApp:', error)
        return { error: error.message }
    }

    return { success: true }
}

export async function updateUserWhatsappNumber(phone: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autorizado' }

    const { error } = await supabase
        .from('users')
        .update({ business_phone: phone })
        .eq('id', user.id)

    if (error) {
        console.error('Erro ao atualizar WhatsApp do Usuário:', error)
        return { error: error.message }
    }

    return { success: true }
}

// ==========================================
// ADMIN: GERENCIAMENTO DE COLUNAS DA FÁBRICA
// ==========================================

async function verifyAdminAccess() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autorizado')

    const { data: userData } = await supabase.from('users').select('tenant_id, role').eq('id', user.id).single()
    if (!userData || userData.role !== 'admin') throw new Error('Acesso negado: Requer privilégios de Administrador.')

    // Bypass de RLS para Admin features
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    return { supabase: supabaseAdmin, tenantId: userData.tenant_id }
}

export async function addProductionStage(name: string) {
    try {
        const { supabase, tenantId } = await verifyAdminAccess()

        // Descobrir a ultima Ordem pra jogar no final
        const { data: lastStage } = await supabase.from('production_stages').select('order').eq('tenant_id', tenantId).order('order', { ascending: false }).limit(1).single()
        const newOrder = lastStage ? lastStage.order + 1 : 1

        const { error } = await supabase.from('production_stages').insert({
            tenant_id: tenantId,
            name: name,
            order: newOrder
        })

        if (error) throw error

        revalidatePath('/dashboard/producao')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function renameProductionStage(stageId: string, newName: string) {
    try {
        const { supabase, tenantId } = await verifyAdminAccess()

        const { error } = await supabase.from('production_stages')
            .update({ name: newName })
            .eq('id', stageId)
            .eq('tenant_id', tenantId)

        if (error) throw error

        revalidatePath('/dashboard/producao')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function deleteProductionStage(stageId: string) {
    try {
        const { supabase, tenantId } = await verifyAdminAccess()

        // Verifica se tem cartao dentro
        const { count } = await supabase.from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('production_stage_id', stageId)
            .eq('tenant_id', tenantId)

        if (count && count > 0) {
            throw new Error(`Não é possível excluir. Existem ${count} ordens de serviço nesta coluna. Movimente-as primeiro.`)
        }

        const { error } = await supabase.from('production_stages')
            .delete()
            .eq('id', stageId)
            .eq('tenant_id', tenantId)

        if (error) throw error

        revalidatePath('/dashboard/producao')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}
