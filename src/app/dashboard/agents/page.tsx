import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
// Removido import do logout via script de layout
import { AgentsManager } from './AgentsManager'

export default async function AgentsSettingsPage() {
    const supabase = await createClient()

    // Proteger a rota: Apenas usuários logados
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

    if (!userData || !userData.tenant_id) {
        redirect('/dashboard')
    }

    let tenantName = 'Sem Empresa Atribuída'
    const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', userData.tenant_id)
        .single()

    if (tenant) tenantName = tenant.name

    // Buscar Agentes do Tenant
    const { data: agentsData } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: true })

    const agents = agentsData || []

    return (
        <div className="p-8 h-screen flex flex-col">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Equipe de Inteligências Artificiais</h2>
                    <p className="text-sm text-gray-500 mt-1">Controle o comportamento, os 'System Prompts' e personalize a sua força de trabalho autônoma.</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <AgentsManager initialAgents={agents} tenantId={userData.tenant_id} />
            </div>
        </div>
    )
}
