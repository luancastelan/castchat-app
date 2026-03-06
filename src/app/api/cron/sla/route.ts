import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = request.headers.get('authorization')

    // Header check (Opcional, comente em dev se for bater o endpoit manualmente via navegador)
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        console.log("⏰ [CRON SLA] Iniciando varredura da IA Gerente de Produção...")

        // 1. Buscar OS na Fábrica que possuam prazo de entrega
        const { data: productionTasks, error: fetchError } = await supabaseAdmin
            .from('conversations')
            .select(`
                id, tenant_id, client_name, client_number, service_type, delivery_date, status, production_stage_id,
                production_stages ( name, whatsapp_group_id )
            `)
            .not('production_stage_id', 'is', null)
            .not('delivery_date', 'is', null)

        if (fetchError) throw fetchError

        let alertsSent = 0
        const now = new Date().getTime()
        const threeHoursMs = 3 * 60 * 60 * 1000
        const oneDayMs = 24 * 60 * 60 * 1000

        if (productionTasks && productionTasks.length > 0) {
            for (const os of productionTasks) {
                const deliveryTime = new Date(os.delivery_date!).getTime()
                const timeDiff = deliveryTime - now

                let messageStr = ''
                let alertType = ''

                if (timeDiff < 0) {
                    alertType = 'ATRASADO'
                    messageStr = `🚨 *URGENTE (ATRASADO)* 🚨\nO serviço *${os.service_type || 'Mídia'}* de *${os.client_name || os.client_number}* estourou o prazo! O que está havendo no setor de *${// @ts-ignore
                        os.production_stages?.name || 'Produção'}*?`
                } else if (timeDiff > 0 && timeDiff <= threeHoursMs) {
                    alertType = '3HORAS'
                    messageStr = `⚠️ *ATENÇÃO: Prazo Apertado* ⚠️\nEquipe de *${// @ts-ignore
                        os.production_stages?.name || 'Produção'}*, faltam menos de 3 horas para entregar o *${os.service_type || 'Serviço'}* de *${os.client_name || os.client_number}*. Como está o andamento?`
                } else if (timeDiff > threeHoursMs && timeDiff <= oneDayMs) {
                    alertType = '1DIA'
                    messageStr = `📅 *Aviso de Produção* 📅\nAtenção setor de *${// @ts-ignore
                        os.production_stages?.name || 'Produção'}*, o serviço *${os.service_type || 'Serviço'}* vence em menos de 1 dia. Bora acelerar!`
                }

                // Disparo Ativo de SLAs
                if (alertType) {
                    // MVP sem filtro de SPAM: Dispara no console, registra no Supabase

                    // 1. Mensagem no Chat Interno da Fábrica (Sem remetente significa Mestre IA)
                    await supabaseAdmin.from('internal_messages').insert({
                        tenant_id: os.tenant_id,
                        conversation_id: os.id,
                        sender_user_id: null,
                        content: messageStr
                    })

                    // 2. Disparar p/ Grupo de WhatsApp da Evolution API daquele Estágio (Se houver configurado)
                    // @ts-ignore
                    if (os.production_stages?.whatsapp_group_id) {
                        // @ts-ignore
                        await sendToEvolutionGroup(os.production_stages.whatsapp_group_id, messageStr, os.tenant_id)
                    }

                    alertsSent++
                }
            }
        }

        return NextResponse.json({
            status: 'success',
            production_tasks_checked: productionTasks?.length || 0,
            alerts_sent: alertsSent
        })

    } catch (error: any) {
        console.error("Cron Error SLA:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

async function sendToEvolutionGroup(groupId: string, message: string, tenantId: string) {
    try {
        const evolutionApiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
        const evolutionApiKey = process.env.EVOLUTION_API_KEY
        const evolutionInstance = `tenant-${tenantId}`

        if (!evolutionApiKey) return;

        const req = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstance}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionApiKey
            },
            body: JSON.stringify({ number: groupId, text: message })
        })

        if (!req.ok) {
            console.error("Falha ao Enviar Alerta do Gerente pro WPP:", await req.text())
        }
    } catch (e) {
        console.error('Falha de Rede no disparo evolution:', e)
    }
}
