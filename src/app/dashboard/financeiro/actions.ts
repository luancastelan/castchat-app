'use server'

import { createClient } from '@/lib/supabase/server'
import { FinancialTransaction } from '@/types/database'
import { revalidatePath } from 'next/cache'

// Verifica se Usuário Logado é ADMIN daquela Tenant (Regra de Negócio Crucial)
async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error("Não autenticado.")

    const { data: userData } = await supabase.from('users').select('tenant_id, role').eq('id', user.id).single()
    if (!userData || userData.role !== 'admin') {
        throw new Error("Acesso Negado. Apenas o Proprietário/Admin pode acessar o Fluxo de Caixa.")
    }
    return userData.tenant_id
}

// 1. Fetch Transações c/ Relacionamentos
export async function getFinancialTransactions(): Promise<{ data?: any[], error?: string }> {
    try {
        const tenantId = await requireAdmin()
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('financial_transactions')
            .select(`
                *,
                clients ( id, name, phone_number ),
                conversations ( id, title:client_name, service_type )
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })

        if (error) return { error: error.message }
        return { data }

    } catch (err: any) {
        return { error: err.message }
    }
}

// 2. Fetch Dashboard Metrics (Faturamento)
export async function getFinancialMetrics(): Promise<{
    metrics?: { totalPaid: number, totalPending: number, totalLate: number },
    error?: string
}> {
    try {
        const tenantId = await requireAdmin()
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('amount, status')
            .eq('tenant_id', tenantId)

        if (error) return { error: error.message }

        let totalPaid = 0;
        let totalPending = 0;
        let totalLate = 0;

        data?.forEach(t => {
            if (t.status === 'paid') totalPaid += Number(t.amount);
            if (t.status === 'pending') totalPending += Number(t.amount);
            if (t.status === 'late') totalLate += Number(t.amount);
        });

        return { metrics: { totalPaid, totalPending, totalLate } }

    } catch (err: any) {
        return { error: err.message }
    }
}

// 3. Criar Transação Manual
export async function createTransaction(payload: Partial<FinancialTransaction>) {
    try {
        const tenantId = await requireAdmin()
        const supabase = await createClient()

        const { error } = await supabase
            .from('financial_transactions')
            .insert({
                ...payload,
                tenant_id: tenantId,
            })

        if (error) return { error: error.message }

        revalidatePath('/dashboard/financeiro')
        return { success: true }
    } catch (err: any) {
        return { error: err.message }
    }
}

// 4. Mudar Status (Baixa manual)
export async function markAsPaid(transactionId: string) {
    try {
        const tenantId = await requireAdmin()
        const supabase = await createClient()

        const { error } = await supabase
            .from('financial_transactions')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', transactionId)
            .eq('tenant_id', tenantId) // Garantia dupla

        if (error) return { error: error.message }

        revalidatePath('/dashboard/financeiro')
        return { success: true }
    } catch (err: any) {
        return { error: err.message }
    }
}
