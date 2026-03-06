import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
// Removido import do logout via script de layout
import { ProductionBoard } from './ProductionBoard'
import { UserProfileWhatsApp } from './UserProfileWhatsApp'

export default async function ProductionCRMPage() {
    const supabase = await createClient()

    // Proteger a rota: Apenas usuários logados
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/login')
    }

    // Buscar informações da empresa (tenant)
    let { data: userData } = await supabase
        .from('users')
        .select('tenant_id, name, role, business_phone')
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

    // Buscar estágios de Produção TÉCNICA
    const { data: rawStages } = await supabase
        .from('production_stages')
        .select('*')
        .eq('tenant_id', userData.tenant_id)
        .order('order', { ascending: true })

    const stages = rawStages || []

    return (
        <div className="p-8 h-screen flex flex-col">
            <header className="mb-6 flex items-center justify-between shrink-0 pl-2">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">CRM de Produção Interna</h2>
                    <p className="text-sm text-gray-500 mt-1">Esteira técnica dos serviços da máquina. (Design, Impressão, etc)</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Botão de WhatsApp que antes ficava cravado na Sidebar do layout */}
                    <UserProfileWhatsApp initialWhatsapp={userData.business_phone} />
                </div>
            </header>

            <div className="flex-1 overflow-x-auto pb-4">
                {/* Componente Client Side (DND) */}
                <ProductionBoard initialStages={stages} tenantId={userData.tenant_id} currentUser={{ id: user.id, name: userData.name || user.email || 'Usuário', role: userData.role }} />
            </div>
        </div>
    )
}
