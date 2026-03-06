import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '../(auth)/login/actions'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/login')
    }

    let { data: userData } = await supabase
        .from('users')
        .select('tenant_id, name, role')
        .eq('id', user.id)
        .single()

    let tenantName = 'Sem Empresa Atribuída'
    let businessType = 'grafica' // Default fallback

    if (userData?.tenant_id) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('name, business_type')
            .eq('id', userData.tenant_id)
            .single()

        if (tenant) {
            tenantName = tenant.name
            businessType = tenant.business_type || 'grafica'
        }
    }

    // Lógica Multi-Nicho: Textos dos Botões adaptados
    const labels = {
        grafica: {
            vendas: 'Vendas (Comercial)',
            producao: 'Chão de Fábrica (Produção)',
            equipe: 'Equipe do RH & Permissões',
            ias: 'Equipe de IAs (Skills)',
            clientes: 'Base de Clientes',
            agenda: 'Calendário (Reuniões)',
            financeiro: 'Caixa e Receitas',
            whatsapp: 'Dispositivo WhatsApp'
        },
        clinica: {
            vendas: 'Recepção (Atendimento)',
            producao: 'Consultório (Procedimentos)',
            equipe: 'Equipe do RH & Permissões',
            ias: 'Equipe de IAs (Atendentes)',
            clientes: 'Agenda de Pacientes',
            agenda: 'Calendário (Consultas)',
            financeiro: 'Financeiro Clínico',
            whatsapp: 'Aparelho Clínico'
        },
        advocacia: {
            vendas: 'Secretaria (Triagem)',
            producao: 'Processos & Prazos',
            equipe: 'Equipe do RH & Permissões',
            ias: 'IAs Paralegais',
            clientes: 'Contatos & Diretório',
            agenda: 'Agenda de Reuniões',
            financeiro: 'Tesouraria (Honorários)',
            whatsapp: 'WhatsApp do Escritório'
        }
    }

    const currentLabels = labels[businessType as keyof typeof labels] || labels.grafica

    return (
        <div className="min-h-screen bg-gray-50 flex overflow-hidden">
            {/* Sidebar Dinâmica Baseada no Nicho */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shrink-0">
                <div className="p-6 mb-2">
                    <h1 className="text-2xl font-bold tracking-tight text-blue-600">CastChat</h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1 font-semibold truncate" title={tenantName}>{tenantName}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-full border border-blue-100">{businessType}</span>
                </div>

                <nav className="flex-1 space-y-2 px-4 overflow-y-auto">
                    <a href="/dashboard" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                        {currentLabels.vendas}
                    </a>
                    <a href="/dashboard/producao" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                        {currentLabels.producao}
                    </a>
                    <a href="/dashboard/agents" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                        {currentLabels.ias}
                    </a>
                    <a href="/dashboard/clientes" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                        {currentLabels.clientes}
                    </a>
                    <a href="/dashboard/agenda" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                        {currentLabels.agenda}
                    </a>

                    {userData?.role === 'admin' && (
                        <>
                            <a href="/dashboard/financeiro" className="flex items-center px-3 py-2.5 text-sm font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors mt-2">
                                {currentLabels.financeiro}
                            </a>
                            <a href="/dashboard/equipe" className="flex items-center px-3 py-2.5 text-sm font-bold rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors mt-2">
                                {currentLabels.equipe}
                            </a>
                        </>
                    )}

                    <a href="/dashboard/whatsapp" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors mt-2">
                        {currentLabels.whatsapp}
                    </a>

                    {/* ROTA SECRETA DO FUNDADOR (Liberada provisóriamente para o Luan testar) */}
                    {userData?.role === 'admin' && (
                        <a href="/dashboard/superadmin" className="flex items-center px-3 py-2.5 text-sm font-bold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors mt-8 ring-1 ring-rose-200">
                            ⚙️ Setup Mágico (SaaS)
                        </a>
                    )}

                    <a href="#" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 opacity-50 cursor-not-allowed mt-2">
                        Configurações
                    </a>
                </nav>

                <div className="p-4 border-t border-gray-200 mt-auto bg-gray-50/50">
                    <div className="mb-4 px-2">
                        <p className="text-sm font-medium text-gray-900 truncate">Logado como</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                    </div>
                    <form action={logout}>
                        <button className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            Sair da conta
                        </button>
                    </form>
                </div>
            </aside>

            {/* Conteúdo Injetado das páginas (Vendas, Fabrica, Agents) */}
            <main className="flex-1 h-screen overflow-y-auto bg-gray-50">
                {children}
            </main>
        </div>
    )
}
