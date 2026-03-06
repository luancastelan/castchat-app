import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
// Import de logout omitido, extraído para layout pai.
import WhatsAppSettings from './WhatsAppSettings'

export default async function WhatsappSettingsPage() {
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

    if (!userData) {
        // Se bater aqui é pq o usuario não entrou no dashboard ainda para criar o tenant
        redirect('/dashboard')
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

    return (
        <div className="p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Integração WhatsApp API</h2>
                    <p className="text-sm text-gray-500 mt-1">Conecte seu dispositivo para liberar a Inteligência Artificial nas conversas.</p>
                </div>
            </header>

            <WhatsAppSettings />
        </div>
    )
}
