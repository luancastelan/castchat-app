'use server'

import { createClient } from '@/lib/supabase/server'
import { Appointment } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { startOfDay, endOfDay, parseISO } from 'date-fns'

// 1. Fetch de todos os Eventos
export async function getAppointments(): Promise<{ data?: any[], error?: string }> {
    const supabase = await createClient()

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            id, title, description, start_time, end_time, status, created_at,
            clients ( id, name, phone_number, avatar_url )
        `)
        .order('start_time', { ascending: true })

    if (error) {
        return { error: error.message }
    }

    return { data: appointments }
}

// 2. Criar novo Compromisso
export async function createAppointment({
    clientId, title, description, startTime, endTime
}: {
    clientId: string, title: string, description: string | null, startTime: string, endTime: string
}) {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: "Sem sessão do Lojista." }

    const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
    if (!userData?.tenant_id) return { error: "Empresa não localizada." }

    const { error: insertError } = await supabase
        .from('appointments')
        .insert({
            tenant_id: userData.tenant_id,
            client_id: clientId,
            title,
            description,
            start_time: startTime,
            end_time: endTime,
            status: 'scheduled'
        })

    if (insertError) {
        return { error: insertError.message }
    }

    revalidatePath('/dashboard/agenda')
    return { success: true }
}

// 3. Atualizar Status (Concluído, Cancelado, etc)
export async function updateAppointmentStatus(appointmentId: string, status: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/agenda')
    return { success: true }
}
