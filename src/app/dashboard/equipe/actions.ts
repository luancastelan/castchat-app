'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createClientRaw } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { User } from '@/types/database'

// 1. Fetch de todos os Funcionários da Empresa Logada (Disponível apenas para Admin ou Auth)
export async function getTeamMembers(): Promise<{ data?: User[], error?: string }> {
    try {
        const supabase = await createClient()

        // Pega Tenant do user logado
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) throw new Error("Não autenticado.")

        const { data: userData } = await supabase.from('users').select('tenant_id, role').eq('id', user.id).single()
        if (!userData?.tenant_id) throw new Error("Tenant não encontrado")

        // Bloqueio extra: Somente admins podem ver a lista de todos (Opcional, mas recomendado p/ RH)
        if (userData.role !== 'admin') {
            throw new Error("Acesso negado: Somente proprietários podem gerenciar a equipe.")
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('tenant_id', userData.tenant_id)
            .order('created_at', { ascending: false })

        if (error) return { error: error.message }
        return { data: data as User[] }

    } catch (err: any) {
        return { error: err.message }
    }
}

// 2. Salvar Permissões da Inteligência (Bula do RH)
export async function updateEmployeeAIPermissions({
    userId, businessPhone, aiInstructions, role
}: {
    userId: string, businessPhone: string, aiInstructions: string, role: string
}) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autenticado.")

        // Regras: Formatar telefone (Limpar símbolos)
        const cleanPhone = businessPhone ? businessPhone.replace(/\D/g, '') : null;

        const { error } = await supabase
            .from('users')
            .update({
                business_phone: cleanPhone,
                ai_instructions: aiInstructions,
                role: role
            })
            .eq('id', userId)

        if (error) return { error: error.message }

        revalidatePath('/dashboard/equipe')
        return { success: true }
    } catch (err: any) {
        return { error: err.message }
    }
}

// 3. Criador Master de Funcionários (Gera Senha Real no Auth e Atrela ao Lojista)
export async function createEmployeeAuth(formData: FormData) {
    try {
        const supabase = await createClient()

        // Segurança 1: Apenas o dono pode fazer isso
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Não autenticado.")

        // Segurança 2: Ele pertence a uma loja e é admin?
        const { data: userData } = await supabase.from('users').select('tenant_id, role').eq('id', user.id).single()
        if (!userData?.tenant_id || userData.role !== 'admin') {
            throw new Error("Apenas o Lojista Master pode criar senhas de acesso.")
        }

        const name = formData.get('name') as string
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const role = formData.get('role') as string

        if (!name || !email || !password || !role) return { error: "Preencha todos os campos do modal." }

        // A. Iniciar API Bypass Master de Auth
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        const supabaseAdmin = createClientRaw(supabaseUrl, supabaseServiceKey)

        // B. Criar Conta E-mail e Senha no núcleo Supabase
        const { data: authData, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        })

        if (authCreateErr || !authData.user) {
            return { error: `Erro Auth: O e-mail já existe no SaaS CastChat ou a senha é muito fraca. Tente outro e-mail corporativo.` }
        }

        // C. Atrelar o cara na tabela users do Inquilino
        const newUserAuthId = authData.user.id

        const { error: dbInsertError } = await supabaseAdmin.from('users').insert({
            id: newUserAuthId,
            tenant_id: userData.tenant_id,
            email,
            name,
            role,
            ai_instructions: `Você está prestando suporte para o funcionário: ${name}.`
        })

        if (dbInsertError) throw new Error(dbInsertError.message)

        revalidatePath('/dashboard/equipe')
        return { success: true }
    } catch (err: any) {
        return { error: err.message }
    }
}
