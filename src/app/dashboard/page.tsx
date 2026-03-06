import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KanbanBoard } from '@/components/ui/KanbanBoard'
import type { PipelineStage, Conversation } from '@/types/database'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Proteger a rota: Apenas usuários logados acessam o dashboard
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/login')
    }

    // Buscar informações da empresa (tenant) e validar se user tem vinculo
    let { data: userData } = await supabase
        .from('users')
        .select('tenant_id, name, role')
        .eq('id', user.id)
        .single()

    // Auto-criar um tenant MOCK e o User caso ele tenha se cadastrado agora e não tenha empresa atribuída.
    // Em um SaaS real teríamos o onboarding "Crie sua empresa"
    if (!userData) {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("SUPABASE_SERVICE_ROLE_KEY não detectada. Adicione no arquivo .env.local para o sistema criar a sua empresa.");
        }

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        // Cria Tenant
        const { data: newTenant, error: tErr } = await supabaseAdmin.from('tenants').insert({
            name: 'CastChat Demo Company (Sua Empresa)',
            plan: 'pro'
        }).select('id').single()

        if (newTenant) {
            // Vincula Usuário
            await supabaseAdmin.from('users').insert({
                id: user.id,
                tenant_id: newTenant.id,
                name: user.email?.split('@')[0],
                role: 'admin'
            })

            // Cria os Estágios de Pipeline Base da Demo
            await supabaseAdmin.from('pipeline_stages').insert([
                { tenant_id: newTenant.id, name: 'Novo Atendimento', "order": 1 },
                { tenant_id: newTenant.id, name: 'Em Criação (Design)', "order": 2 },
                { tenant_id: newTenant.id, name: 'Aguardando Aprovação', "order": 3 },
                { tenant_id: newTenant.id, name: 'Impressão & Produção', "order": 4 },
            ])

            // Cria algumas conversas fake pra vermos o drag and drop funcionando logo de cara
            const { data: defaultStages } = await supabaseAdmin.from('pipeline_stages').select('id, name').eq('tenant_id', newTenant.id)
            if (defaultStages && defaultStages.length > 0) {
                await supabaseAdmin.from('conversations').insert([
                    { tenant_id: newTenant.id, client_number: '5511999990001', client_name: 'Marcos Silva (Lona 3x2)', status: 'bot', stage_id: defaultStages[0].id },
                    { tenant_id: newTenant.id, client_number: '5511999990002', client_name: 'Juliana Costa (Adesivo Vitrine)', status: 'designer', stage_id: defaultStages[1].id, assigned_user_id: user.id },
                    { tenant_id: newTenant.id, client_number: '5511999990003', client_name: 'TechCorp (Totem Acrílico)', status: 'aguardando_cliente', stage_id: defaultStages[2].id, assigned_user_id: user.id }
                ])
            }

            // Recarrega userData
            userData = { tenant_id: newTenant.id, name: user.email?.split('@')[0], role: 'admin' }
        }
    }

    let tenantName = 'Sem Empresa Atribuída'

    if (userData?.tenant_id) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', userData.tenant_id)
            .single()

        if (tenant) tenantName = tenant.name
    }

    // Buscar estágios do pipeline
    const { data: stagesData } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('order', { ascending: true })

    const stages: PipelineStage[] = stagesData || []

    // Buscar conversas ativas
    const { data: conversationsData } = await supabase
        .from('conversations')
        .select('*')
        .neq('status', 'fechado')
        .neq('status', 'perdido')
        .order('last_message_at', { ascending: false })

    const conversations: Conversation[] = conversationsData || []

    return (
        <div className="p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Visão Geral do Atendimento</h2>
                    <p className="text-sm text-gray-500 mt-1">Nao deixe seus clientes no vácuo. Mova os cards entre as etapas do pipeline.</p>
                </div>
                <div className="text-sm font-medium bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                    Papel: <span className="text-blue-600">{userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'Admin'}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <h3 className="text-gray-500 text-sm font-medium truncate">Total de Conversas</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{conversations.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <h3 className="text-gray-500 text-sm font-medium truncate">Aguardando IA</h3>
                    <p className="mt-2 text-3xl font-bold text-purple-600">{conversations.filter(c => c.status === 'bot').length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <h3 className="text-gray-500 text-sm font-medium truncate">Aguardando Design</h3>
                    <p className="mt-2 text-3xl font-bold text-blue-600">{conversations.filter(c => c.status === 'designer').length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center border-l-4 border-l-red-500">
                    <h3 className="text-gray-500 text-sm font-medium truncate">Atrasos (SLA)</h3>
                    <p className="mt-2 text-3xl font-bold text-red-600">
                        {conversations.filter(c => new Date().getTime() - new Date(c.last_message_at).getTime() > 60 * 60 * 1000).length}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-300px)] flex flex-col">
                {stages.length > 0 ? (
                    <div className="p-6 w-full h-full">
                        <KanbanBoard stages={stages} initialConversations={conversations} />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center flex-col gap-4 text-center p-6 bg-gray-50/50">
                        <p className="text-gray-500 max-w-md">
                            Nenhum estágio do Pipeline foi criado para sua empresa ainda.
                        </p>
                        <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">Use a inteligência ou o banco de dados para criar estágios iniciais</span>
                    </div>
                )}
            </div>
        </div>
    )
}
