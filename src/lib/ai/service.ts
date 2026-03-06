import Groq from 'groq-sdk'
import type { Message } from '@/types/database'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
})

export async function generateAiResponse(history: Message[], tenantId: string, currentStatus: string): Promise<{ text?: string, tool_calls?: any[] }> {
    if (!process.env.NEXT_PUBLIC_GROQ_API_KEY) {
        return { text: "⚠️ Erro: Chave da Groq não configurada no .env.local" }
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Decobre a especialidade baseada na coluna do usuário
    let targetRole = 'reception'
    if (currentStatus === 'designer' || currentStatus === 'aguardando_cliente') {
        targetRole = 'estimator'
    } else if (currentStatus === 'producao') {
        targetRole = 'production'
    } else if (currentStatus === 'fechado') {
        targetRole = 'billing'
    }

    // Busca o cérebro/personalidade desse agente nesta empresa
    const { data: agent } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role', targetRole)
        .eq('is_active', true)
        .single()

    if (!agent) {
        console.warn(`[CastChat AI] O Agente da especialidade ${targetRole} está desativado ou não existe para o Tenant ${tenantId}.`)
        return { text: "⚠️ Assistente indisponível ou desativado nesta coluna." }
    }

    const agentTemperature = agent.temperature || 0.3

    const currentDate = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const SYSTEM_PROMPT = `${agent.system_prompt}
    
    [INFO DE SISTEMA]: 
    - A data e hora atual do sistema é: ${currentDate}. Baseie seus agendamentos a partir desta data. Não agende reuniões no passado.
    - O Horário de Funcionamento padrão é das 09:00 às 18:00 (Seg à Sex).`

    // Formatando o histórico 
    const formattedHistory = history.map(msg => ({
        role: (msg.sender === 'bot' || msg.sender === 'user') ? 'assistant' : 'user',
        content: msg.sender === 'user' ? `[Atendente Humano]: ${msg.content}` : msg.content
    }))

    const messages: any[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...formattedHistory
    ]

    try {
        console.log(`🤖 Agente Assumindo: [${agent.name}] - Temperatura: ${agentTemperature}`)

        const tools = [
            {
                type: "function",
                function: {
                    name: "check_availability",
                    description: "Verifica os horários disponíveis e as consultas já agendadas para um determinado dia.",
                    parameters: {
                        type: "object",
                        properties: {
                            target_date: {
                                type: "string",
                                description: "A data alvo que o cliente deseja verificar. Obrigatório no formato AAAA-MM-DD (ex: 2024-12-25)."
                            }
                        },
                        required: ["target_date"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "book_appointment",
                    description: "Registra ou agenda um compromisso OFICIAL no calendário depois que o cliente concordou com um horário livre.",
                    parameters: {
                        type: "object",
                        properties: {
                            title: {
                                type: "string",
                                description: "Título ou assunto curto do agendamento (Ex: Consulta Médica, Corte de Cabelo)"
                            },
                            target_start: {
                                type: "string",
                                description: "Data e hora exata de INÍCIO do agendamento no formato ISO-8601 (Ex: 2024-12-25T14:00:00-03:00)"
                            },
                            target_end: {
                                type: "string",
                                description: "Data e hora exata de TÉRMINO do agendamento no formato ISO-8601 (Ex: 2024-12-25T15:00:00-03:00)"
                            }
                        },
                        required: ["title", "target_start", "target_end"]
                    }
                }
            }
        ];

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: Number(agentTemperature),
            max_tokens: 500,
            tools: tools as any,
            tool_choice: "auto"
        })

        const responseMessage = chatCompletion.choices[0]?.message

        if (responseMessage?.tool_calls) {
            console.log("🛠️ IA SOLICITOU TOOL CALL:", responseMessage.tool_calls[0].function.name)
            return { tool_calls: responseMessage.tool_calls }
        }

        const responseStr = responseMessage?.content || "Desculpe, não entendi."
        console.log("Resposta obtida da Groq:", responseStr)

        return { text: responseStr }
    } catch (error: any) {
        console.error("GROQ CRITICAL ERROR:", error)
        return { text: `⚠️ Erro detalhado na IA: ${error.message} \n Cause: ${error.cause}` }
    }
}

export async function generateInternalRhResponse({
    message, employeeData, tenantId, pushName
}: { message: string, employeeData: any, tenantId: string, pushName: string }) {
    if (!process.env.NEXT_PUBLIC_GROQ_API_KEY) {
        return "⚠️ Erro: Chave da Groq não configurada no .env.local"
    }

    try {
        const roleTranslate: Record<string, string> = {
            'admin': 'Dono(a) / Proprietário(a)',
            'manager': 'Gerente Operacional',
            'employee': 'Funcionário(a)'
        }

        const SYSTEM_PROMPT = `Você é o "Gerente Virtual" do SaaS CastChat.
Você está prestando suporte via WhatsApp para um funcionário DE DENTRO da empresa.
Você deve agir com polidez corporativa, mas ser estrito às REGRAS estabelecidas na Bula dele.

=== CONTEXTO DA PESSOA QUE ESTÁ FALANDO COM VOCÊ ===
NOME: ${employeeData.name || pushName}
CARGO GERAL: ${roleTranslate[employeeData.role]}
NÍVEL DE ACESSO SISTÊMICO: ${employeeData.role.toUpperCase()}

=== BULA DO PROPRIETÁRIO (O QUE VOCÊ PODE OU NÃO FAZER/FALAR COM ESSA PESSOA) ===
"""
${employeeData.ai_instructions || "O Administrador ainda não definiu Regras Específicas para esta pessoa. Responda apenas sobre assuntos banais ou peça para o funcionário solicitar liberação de escopo ao Dono do sistema."}
"""

=== INSTRUÇÃO MESTRA ===
Se o funcionário pedir um dado ou fazer uma ação (Ex: "Qual o faturamento?") que vai contra a BULA acima, negue educadamente e diga que você não tem permissão para revelar a informação, citando a regra do dono.
Lembre-se: Seja direto e conciso no WhatsApp, em Português-BR.
`

        const groqRHAgent = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY })

        const chatCompletion = await groqRHAgent.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: message }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2, // Racional, Foco nas Regras (Pouca alucinação em permissões)
            max_tokens: 350,
        })

        return chatCompletion.choices[0]?.message?.content || "Desculpe, não consegui processar sua requisição no RH."

    } catch (error: any) {
        console.error("GROQ RH ERROR:", error)
        return `⚠️ Erro de Servidor no Módulo RH: ${error.message}`
    }
}
