'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createClientRaw } from '@supabase/supabase-js'

// Interface de Cadastro Mestre (Apenas Dono do Sistema)
export async function createTenantWithTemplate(formData: FormData) {
    const supabase = await createClient()

    // 1. Validar se quem chamou a função é um Admin (P/ testarmos na sua máquina atual)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: "Acesso Negado." }

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin') {
        return { error: 'Acesso Negado: Só usuários Admin podem fundar Novas Lojas no modo de Depuração Luan.' }
    }

    const tenantName = formData.get('tenantName') as string
    const ownerEmail = formData.get('ownerEmail') as string
    const businessType = formData.get('businessType') as string
    const initialPassword = formData.get('initialPassword') as string // NOVO CAMPO

    if (!tenantName || !ownerEmail || !businessType || !initialPassword) {
        return { error: "Preencha Nome, E-mail, Nicho e Senha Inicial." }
    }

    try {
        // 2A. Iniciar Cliente Admin Absoluto (Bypass RLS para Auth)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        const supabaseAdmin = createClientRaw(supabaseUrl, supabaseServiceKey)

        // 2B. Criar a Conta de Auth Oficial (Email e Senha Real pro Dono da Loja)
        const { data: authData, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
            email: ownerEmail,
            password: initialPassword,
            email_confirm: true // Pula verificação de e-mail por enquanto p/ agilizar o SaaS
        })

        if (authCreateErr || !authData.user) {
            return { error: `Falha ao criar Login no Auth (E-mail já existe?): ${authCreateErr?.message}` }
        }

        const newUserId = authData.user.id

        // == ROTINA DE ROLLBACK (Evita Usuários Fantasmas se o Banco de Dados Falhar) ==
        try {
            // 2C. Criar a Loja Nova na Tabela TENANTS com a flag de Nicho via Admin Key
            const { data: newTenant, error: tenantErr } = await supabaseAdmin
                .from('tenants')
                .insert({ name: tenantName, business_type: businessType })
                .select('*')
                .single()

            if (tenantErr || !newTenant) throw new Error(tenantErr?.message || "Erro BD Tenant")
            const tenantId = newTenant.id

            // 3. Cadastrar o Lojista na tabela relacional 'users' vinculando ao Tenant criado
            const { error: userErr } = await supabaseAdmin
                .from('users')
                .insert({
                    id: newUserId, // <--- ID Autêntico do Auth!
                    tenant_id: tenantId,
                    email: ownerEmail,
                    name: 'Proprietário(a)',
                    role: 'admin',
                    ai_instructions: 'LIBERADO GERAL: Você está falando com o Diretor da Empresa. Se ele perguntar Dúvidas de Fluxo de Caixa, Estoque ou Perfomance, ele tem passe livre.'
                })

            if (userErr) throw new Error(userErr.message || "Erro Inserindo Perfil Publico")

            // 4. Executar o Seeding Boilerplate (A Injeção do Setup Mágico via Admin Key)
            await injectVerticalTemplate(supabaseAdmin, tenantId, businessType)

            return { success: true, message: `Loja ${tenantName} criada e Ativada com Sucesso no modo ${businessType.toUpperCase()}!` }

        } catch (innerError: any) {
            // CATASTROFE: O Auth Criou, MAS a tabela falhou (Falta de coluna, RLS, etc)
            // AÇÃO: Deletar o Auth que acabamos de criar pra não prender o e-mail do cliente!!!
            console.error("Erro interno BD criando loja, iniciando ROLLBACK do E-mail:", innerError.message)
            await supabaseAdmin.auth.admin.deleteUser(newUserId)
            return { error: `Erro grave montando o Lojista. A Conta foi cancelada automaticamente para liberar o e-mail. Motivo: ${innerError.message}` }
        }

    } catch (e: any) {
        console.error("Criacao Tenant Error:", e)
        return { error: `Cata Strophic Failure: ${e.message}` }
    }
}

// O Motor Secreto de Verticalização SaaS
async function injectVerticalTemplate(supabase: any, tenantId: string, businessType: string) {

    let stages: any[] = []
    let aiPromptBase = ""

    // ============================================
    // TEMPLATE 1: CLÍNICA / ODONTOLOGIA / SAÚDE
    // ============================================
    if (businessType === 'clinica') {
        stages = [
            { tenant_id: tenantId, name: 'Recepção (Triagem)', color: 'bg-blue-100 text-blue-800', order: 0 },
            { tenant_id: tenantId, name: 'Avaliação Marcada', color: 'bg-yellow-100 text-yellow-800', order: 1 },
            { tenant_id: tenantId, name: 'Sala de Procedimento', color: 'bg-purple-100 text-purple-800', order: 2 },
            { tenant_id: tenantId, name: 'Fechado/Pago', color: 'bg-green-100 text-green-800', order: 3 },
            { tenant_id: tenantId, name: 'Retorno (Pós-Op)', color: 'bg-gray-100 text-gray-800', order: 4 },
        ]

        aiPromptBase = `Você é a Atendente Clínica de Recepção de Alto Nível de uma clínica médica/odontológica do CastChat.
OBJETIVO ZERO: Não exija pagamento antecipado em suas respostas. Seu foco ABSOLUTO é agendar a "Primeira Consulta de Avaliação". 
MANTRA: Se o paciente perguntar o preço de algo como "Colocar aparelho" ou "Implante", responda gentilmente: "Os valores exatos eu só posso te passar após ver sua radiografia/boca com as Doutoras, mas temos condições que cabem em todo bolso. Vamos agendar sua avaliação gratuita ou com taxa simbólica na terça?"
Nunca prescreva tratamentos online. Se ele quiser agendar, jogue na coluna de Avaliação usando [ACTION:DESIGNER] que o suporte assumirá o funil interno.`
    }
    // ============================================
    // TEMPLATE 2: ESCRITÓRIO DE ADVOCACIA
    // ============================================
    else if (businessType === 'advocacia') {
        stages = [
            { tenant_id: tenantId, name: 'Triagem Paralegal', color: 'bg-blue-100 text-blue-800', order: 0 },
            { tenant_id: tenantId, name: 'Análise de Documentos', color: 'bg-yellow-100 text-yellow-800', order: 1 },
            { tenant_id: tenantId, name: 'Emissão Contrato Honorários', color: 'bg-purple-100 text-purple-800', order: 2 },
            { tenant_id: tenantId, name: 'Processo Protocolado', color: 'bg-green-100 text-green-800', order: 3 },
            { tenant_id: tenantId, name: 'Audiência Agendada', color: 'bg-red-100 text-red-800', order: 4 },
        ]

        aiPromptBase = `Você é um Robô Paralegal de triagem e captação de clientes de um conceituado Escritório de Advocacia.
O seu foco é jurídico. Quando um cliente bater na porta, recolha as informações básicas: "Olá, bem-vindo. Por favor, me explique brevemente sobre o que se trata o seu caso (trabalhista, cível, divórcio, etc) para eu encaminhar ao Advogado Especialista."
Não faça consultoria jurídica (não afirme vitória no caso nem dê prazos falsos do judiciário). 
Se a causa fizer sentido e o cliente explicar os fatos, diga que um dos Doutores irá analisar a viabilidade da causa e peça para ele aguardar, usando no final da mensagem oculta a tag [ACTION:DESIGNER] para arquivá-lo no funil de Documentos.`
    }
    // ============================================
    // TEMPLATE 3: DELIVERY / RESTAURANTE / FAST FOOD
    // ============================================
    else if (businessType === 'restaurante') {
        stages = [
            { tenant_id: tenantId, name: 'Enviou Cardápio / Dúvidas', color: 'bg-blue-100 text-blue-800', order: 0 },
            { tenant_id: tenantId, name: 'Cozinha: Preparando', color: 'bg-orange-100 text-orange-800', order: 1 },
            { tenant_id: tenantId, name: 'Saiu c/ Motoboy', color: 'bg-purple-100 text-purple-800', order: 2 },
            { tenant_id: tenantId, name: 'Pedido Entregue', color: 'bg-green-100 text-green-800', order: 3 },
            { tenant_id: tenantId, name: 'IFood Cancelado', color: 'bg-red-100 text-red-800', order: 4 },
        ]

        aiPromptBase = `Você é o Garçom Virtual / Atendente de Frente de Caixa. 
Seu trabalho é ágil (Fast Food mood). Se alguém disser "Opa", mande o Boa Noite Caloroso com o Link do Cardápio Online e as Taxas de Bairro, se houver.
Se o cliente pedir pelo WhatsApp: 1. Confirme o Pedido exato. 2. Pergunte a Forma de Pagamento (Pra mandar troco se for dinheiro). 3. EXIJA Rua, Número e Bairro.
Quando estiver tudo redondo, diga "Fechado chefe! 30 minutinhos." e mande a tag [ACTION:DESIGNER] pra tela pular pra tela da Cozinha.`
    }
    // ============================================
    // TEMPLATE PADRÃO: GRÁFICAS / MARcenarias / INDUSTRIAS
    // ============================================
    else {
        stages = [
            { tenant_id: tenantId, name: 'Em Atendimento', color: 'bg-blue-100 text-blue-800', order: 0 },
            { tenant_id: tenantId, name: 'Aguardando Arte / Orçamento', color: 'bg-yellow-100 text-yellow-800', order: 1 },
            { tenant_id: tenantId, name: 'Em Fabricação', color: 'bg-purple-100 text-purple-800', order: 2 },
            { tenant_id: tenantId, name: 'Pronto pra Retirada', color: 'bg-green-100 text-green-800', order: 3 },
        ]

        aiPromptBase = `Você é Atendente Oficial / Vendedora de Frente de Caixa.
Responda aos clientes tirando dúvidas simples, coletando os dados do que ele deseja comprar e preparando a venda.
Seja amistosa e direta.
Se for necessário O Atendente Humano Orçamentista revisar (Dúvida técnica de medida pesada), Mande a tag [ACTION:DESIGNER] embutida no texto para notificar o humano da fábrica.`
    }

    // ============================================
    // CONFIGURAÇÃO DOS AGENTES DE IA INICIAIS
    // ============================================
    const defaultAgents = [
        {
            tenant_id: tenantId,
            name: "Liza",
            role: "reception",
            system_prompt: aiPromptBase,
            temperature: 0.3, // Mais robótica e restrita a regras na triagem
            is_active: true,
            is_system_default: true
        },
        {
            tenant_id: tenantId,
            name: "Robocop",
            role: "estimator",
            system_prompt: `Você é uma IA calculadora. Seu papel é pegar os dados coletados pela Liza e passar orçamentos baseados no catálogo da empresa. Nunca invente um serviço.`,
            temperature: 0.1, // Frio e calculista
            is_active: true,
            is_system_default: true
        }
    ]

    // DISPARO 1: Injeta Estágios do Pipeline do Chat Comercial
    await supabase.from('pipeline_stages').insert(stages)

    // DISPARO 2: Injeta a Equipe Base de Inteligência Artificial
    await supabase.from('ai_agents').insert(defaultAgents)
}
