'use server'

import { createClient } from '@/lib/supabase/server'
import { Client } from '@/types/database'
import { revalidatePath } from 'next/cache'

export async function getClients(): Promise<{ data?: Client[], error?: string }> {
    const supabase = await createClient()

    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return { error: error.message }
    }

    return { data: clients as Client[] }
}

export async function updateClientNotes(clientId: string, notes: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('clients')
        .update({ notes })
        .eq('id', clientId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/clientes')
    return { success: true }
}

export async function createOutboundConversation(clientId: string, clientNumber: string, clientName: string | null) {
    const supabase = await createClient()

    // 1. Get Tenant ID to link things properly
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: "Sem sessão." }

    const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
    if (!userData?.tenant_id) return { error: "Empresa não localizada." }

    const tenantId = userData.tenant_id

    // 2. Discover the default First Stage (Triagem/Bot)
    const { data: firstStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('tenant_id', tenantId)
        .order('order', { ascending: true })
        .limit(1)
        .single()

    // 3. Create the Ghost Ticket in the Pipeline waiting for the user to chat.
    // Atribuímos o status 'designer' (equivalente a atendimento humano ignorando o Bot).
    const { data: newConv, error: newConvErr } = await supabase
        .from('conversations')
        .insert({
            tenant_id: tenantId,
            client_id: clientId,
            client_number: clientNumber,
            client_name: clientName || 'Cliente Ativo',
            status: 'designer',
            stage_id: firstStage?.id
        })
        .select('*')
        .single()

    if (newConvErr || !newConv) {
        return { error: newConvErr?.message || "Erro desconhecido na criação do ticket." }
    }

    revalidatePath('/dashboard')

    // Devolve para o front-end qual foi o ID do Chat criado para ele redirecionar ou abrir direto.
    return { success: true, conversationId: newConv.id }
}

export async function createNewClient(name: string, phoneNumber: string) {
    const supabase = await createClient()

    // Validação
    if (!phoneNumber) return { error: "Número de WhatsApp é obrigatório." }

    // Pegar o Usuário Atual e o Perfil (Extensão) Dele
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Não Autenticado" }

    const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!userData?.tenant_id) return { error: "Sem tenant vinculado" }

    // Tratando Regex Numeral (Sanitização)
    const rawNumber = phoneNumber.replace(/\D/g, '')

    // Verificar Se ele Já Existe
    const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', userData.tenant_id)
        .eq('phone_number', rawNumber)
        .single()

    if (existingClient) return { error: "Este WhatsApp já está cadastrado em sua Base." }

    // Inserir de Verdade
    const { error: insertError } = await supabase
        .from('clients')
        .insert({
            tenant_id: userData.tenant_id,
            name: name || 'Novo Cliente',
            phone_number: rawNumber
        })

    if (insertError) {
        console.error("Criar Cliente DB Err:", insertError)
        return { error: 'Ocorreu um erro ao salvar o contato.' }
    }

    revalidatePath('/dashboard/clientes')
    return { success: true }
}
