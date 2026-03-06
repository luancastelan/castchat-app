import { NextRequest, NextResponse } from 'next/server'
import { createClient as createClientRaw } from '@supabase/supabase-js'

// Variáveis Universais do Server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || ''
const evoUrl = process.env.EVOLUTION_API_URL || ''
const evoKey = process.env.EVOLUTION_API_KEY || ''

export async function GET(req: NextRequest) {
    // 1. Inicia Banco com Chave Mestra para bypassear Tenants (É um robo operando para TODOS)
    const supabaseAdmin = createClientRaw(supabaseUrl, supabaseServiceKey)

    try {
        console.log("🤖 [CRON FISCAL] Iniciando varredura de O.S...")

        // 2. Buscar todas as Ordens de Serviços na Fábrica que o Prazo expirou e ainda não finalizou
        // Para simplificar: delivery_date <= NOW()
        const { data: delayedOs, error: osErr } = await supabaseAdmin
            .from('conversations')
            .select(`
                id, tenant_id, client_name, delivery_date, service_type,
                production_stage_id,
                stage:production_stages!inner(id, name, whatsapp_group_id),
                user:users!inner(id, name, business_phone)
            `)
            .not('production_stage_id', 'is', null) // Está na fábrica
            .not('delivery_date', 'is', null) // Tem prazo
            .lte('delivery_date', new Date().toISOString()) // Prazo Menor ou igual Hoje (Atrasou!)

        if (osErr) throw new Error("Erro DB OS: " + osErr.message)
        if (!delayedOs || delayedOs.length === 0) {
            return NextResponse.json({ message: "Tudo voando! Nenhuma O.S Atrasada." })
        }

        let sentAlerts = 0

        // 3. Loop nas O.S Atrasadas
        for (const os of delayedOs as any[]) {
            const stage = os.stage
            const employee = os.user

            // Se a coluna onde ela tá parada não tem WhatsApp configurado, a IA não tem onde gritar. Ignora (apenas logs visuais no painel no futuro)
            if (!stage.whatsapp_group_id) continue;

            // 3.1 Validar Anti-Spam (SLA Alerts)
            // A IA ja gritou que essa OS específica atrasou NESTA Coluna hoje?
            const { data: existingAlert } = await supabaseAdmin
                .from('sla_alerts')
                .select('id')
                .eq('conversation_id', os.id)
                .eq('stage_id', stage.id)
                .eq('alert_level', 'critical')
                .single()

            if (existingAlert) {
                // Já levou bronca por estar parada aqui. Pula para o proximo loop
                continue;
            }

            // 3.2 Montar Contexto pro LLM dar a Bronca
            const prompt = `Você é o "Fiscal de Produção" rigoroso de uma empresa.
CENÁRIO CRÍTICO:
- Serviço: ${os.service_type || 'Pedido Genérico'}
- Cliente: ${os.client_name || 'Desconhecido'}
- Prazo era para: ${new Date(os.delivery_date).toLocaleString()} (JÁ PASSOU)
- Setor onde a batata tá assando: ${stage.name}
- Funcionário Responsável: ${employee.name} (Telefone: ${employee.business_phone || 'Sem Zap'})

AÇÃO: 
Escreva uma mensagem de no máximo 2 linhas para enviar no grupo do WhatsApp da equipe. 
Comece a mensagem EXATAMENTE assim: "@${employee.business_phone}" (para marcar o zap dele).
Seja enérgico, cobre a entrega imediata ou um Status do porquê o ${os.service_type} do(a) ${os.client_name} ainda está travado em ${stage.name}. Não use formatações estranhas, apenas texto limpo e direto.`

            // 3.3 Requisitar IA Groq
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${groqApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: prompt }],
                    temperature: 0.7
                })
            })

            const groqData = await groqRes.json()
            if (!groqData.choices) {
                console.error("Falha Groq", groqData)
                continue;
            }

            const aiMessage = groqData.choices[0].message.content

            // 3.4 Disparar Mensagem no Zap (Evolution API)
            // Busca o Nome da Instância baseada no Tenant da O.S (CastChat Multi-Tenant WhatsApp)
            // Usaremos a Instância Interna (Gerencial) para cobrar a equipe
            // Padrão atualizado do CastChat V2: tenant-UUID-internal
            const instanceName = `tenant-${os.tenant_id}-internal`

            const evoPayload = {
                number: stage.whatsapp_group_id, // Ex: "12036...g.us"
                text: "*[🚨Aviso do Fiscal]* " + aiMessage
            }

            try {
                // Disparo Ativo Grupo
                await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': evoKey
                    },
                    body: JSON.stringify(evoPayload)
                })

                // Registra que já enviamos pra não inundar o chat amanhã
                await supabaseAdmin.from('sla_alerts').insert({
                    tenant_id: os.tenant_id,
                    conversation_id: os.id,
                    stage_id: stage.id,
                    alert_level: 'critical',
                    message_sent: evoPayload.text
                })

                // Disparo 2 (Interno na Tarefa UI)
                await supabaseAdmin.from('internal_messages').insert({
                    tenant_id: os.tenant_id,
                    conversation_id: os.id,
                    sender_user_id: employee.id, // O ideal seria criar um usuario "Sistema" pra evitar isso, mas bypass
                    content: `[LOG IA VIGILANTE]: ${aiMessage}`
                })

                sentAlerts++;

            } catch (e: any) {
                console.error("Falha WPP API", e)
            }
        }

        return NextResponse.json({ message: `Varredura Concluida. ${sentAlerts} Duras dadas nas equipes.` })

    } catch (err: any) {
        console.error("Fatal Cron Error", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
