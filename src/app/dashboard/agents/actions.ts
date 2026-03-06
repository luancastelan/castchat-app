'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateAgent(id: string, data: { name: string; system_prompt: string; temperature: number; is_active: boolean }) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('ai_agents')
        .update(data)
        .eq('id', id)

    if (error) {
        console.error("Falha ao salvar Skill/Agent:", error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/agents')
    return { success: true }
}

export async function createAgent(data: { tenant_id: string; name: string; role: string; system_prompt: string; temperature: number; is_active: boolean; is_system_default: boolean }) {
    const supabase = await createClient()

    const { data: newAgent, error } = await supabase
        .from('ai_agents')
        .insert(data)
        .select('*')
        .single()

    if (error) {
        console.error("Falha ao criar Skill/Agent:", error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/agents')
    return { success: true, agent: newAgent }
}
export async function deleteAgent(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', id)
        .eq('is_system_default', false) // Trava pra nao apagar o que veio de fabrica

    if (error) {
        console.error("Falha ao Deletar Skill/Agent:", error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/agents')
    return { success: true }
}
