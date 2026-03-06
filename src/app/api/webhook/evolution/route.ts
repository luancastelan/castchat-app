import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAiResponse, generateInternalRhResponse } from '@/lib/ai/service'

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        const body = await request.json()

        // Exemplo básico do Payload Evolution API (MESSAGES_UPSERT)
        if (body.event === 'messages.upsert' || body.data) {

            // Tratamento Misto para V1 e V2
            const dataLayer = body.data || body

            // O container da mensagem real (texto)
            const messagePayload = dataLayer?.message || dataLayer?.messages?.[0] || dataLayer;

            // Chave identificadora (remetente)
            const keyLayer = messagePayload?.key || dataLayer?.key

            if (!keyLayer || keyLayer?.fromMe) {
                // Ignore self-messages (Robô)
                return NextResponse.json({ status: 'ignored' }, { status: 200 })
            }

            const remoteJid = keyLayer?.remoteJid || messagePayload?.remoteJid

            // Ignorar origens de Grupos (@g.us) no WhatsApp (Baileys Pattern)
            if (remoteJid?.includes('@g.us')) {
                return NextResponse.json({ status: 'ignored_group' }, { status: 200 })
            }

            const clientNumber = remoteJid?.split('@')[0]
            const pushName = dataLayer?.pushName || messagePayload?.pushName || 'Usuário'

            const messageType = dataLayer?.messageType || messagePayload?.type || 'conversation';

            // Tratamento Textual
            let messageContent = '';
            if (messageType === 'audioMessage') messageContent = '🔊 [Mensagem de Áudio]';
            else if (messageType === 'imageMessage') messageContent = '🖼️ [Imagem Recebida]';
            else if (messageType === 'videoMessage') messageContent = '🎥 [Vídeo Recebido]';
            else if (messageType === 'documentMessage') messageContent = '📄 [Documento Recebido]';
            else if (messageType === 'stickerMessage') messageContent = '👾 [Figurinha Recebida]';
            else {
                messageContent = messagePayload?.conversation ||
                    messagePayload?.message?.conversation ||
                    messagePayload?.extendedTextMessage?.text ||
                    messagePayload?.message?.extendedTextMessage?.text ||
                    messagePayload?.text ||
                    dataLayer?.text || '';
            }

            if (!clientNumber || !messageContent) {
                return NextResponse.json({ status: 'invalid_format' }, { status: 400 })
            }

            // 1. Identificar qual Empresa (Tenant) e o TIPO do Zap ('public' vs 'internal')
            const instanceName = body?.instance || dataLayer?.instance || ''
            let activeTenantId: string | null = null;
            let isInternalChat = instanceName.endsWith('-internal')

            if (instanceName.startsWith('tenant-')) {
                activeTenantId = instanceName.replace('tenant-', '').replace('-internal', '')
            } else {
                activeTenantId = process.env.DEFAULT_TENANT_ID || null
            }

            if (!activeTenantId) {
                return NextResponse.json({ error: 'Tenant Desconhecido' }, { status: 400 })
            }

            console.log(`💬 Webhook [${isInternalChat ? 'RH' : 'CRM'}]: [${clientNumber}] ${messageContent}`);

            // =========================================================================
            // 🌊 RIO 1: FLUXO GERENCIAL / RH (FASE 10 - CHAT PRIVADO DA INTRANET)
            // =========================================================================
            if (isInternalChat) {
                // A) Checagem Biometrica Militar de Seguro de Dados (RBAC via Zap)
                const { data: employeeData } = await supabaseAdmin
                    .from('users')
                    .select('id, name, role, ai_instructions')
                    .eq('tenant_id', activeTenantId)
                    .eq('business_phone', clientNumber)
                    .single()

                if (!employeeData) {
                    // BLOQUEIO EXTREMO: Quem mandou a mensagem não é funcionário dessa loja.
                    // A IA simplesmente o ignora (Ghosting) para não dar indicios a espião.
                    console.warn(`[SECURITY] Número Desconhecido tentou falar com o Zap Interno do Tenant ${activeTenantId}`)
                    return NextResponse.json({ status: 'ignored_unauthorized' }, { status: 200 })
                }

                // O Dono / Funcionario reconhecido disparou:
                // Aqui delegamos à Groq um chat isolado (sem precisar criar conversas de funil no BD).
                // Geramos RAG (Busca BD) instantânea pros Finanças (se Admin) e passamos o prompt de Bulas.
                const rhAiResponse = await generateInternalRhResponse({
                    message: messageContent,
                    employeeData: employeeData,
                    tenantId: activeTenantId,
                    pushName: pushName
                })

                // Disparar resposta da IA Gerencial de volta
                const evoUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
                const evoKey = process.env.EVOLUTION_API_KEY || ''
                try {
                    await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
                        method: 'POST',
                        body: JSON.stringify({ number: clientNumber, text: rhAiResponse }),
                        headers: { 'Content-Type': 'application/json', 'apikey': evoKey }
                    })
                } catch (e) {
                    console.error("Erro rede Evo API (RH)", e)
                }

                // Retorna 200 porque lidou lindamente c o RH sem sujar as tabelas do CRM Externo.
                return NextResponse.json({ status: 'processed_internal' }, { status: 200 })
            }

            // =========================================================================
            // 🌊 RIO 2: FLUXO PÚBLICO (CRM NORMAL DE VENDAS E LEADS)
            // =========================================================================
            let { data: currClient } = await supabaseAdmin
                .from('clients')
                .select('id, name')
                .eq('tenant_id', activeTenantId)
                .eq('phone_number', clientNumber)
                .single()

            if (!currClient) {
                const { data: insertedClient } = await supabaseAdmin
                    .from('clients')
                    .insert({ tenant_id: activeTenantId, phone_number: clientNumber, name: pushName })
                    .select('id, name')
                    .single()
                currClient = insertedClient
            }

            const clientId = currClient?.id

            let { data: openConvs } = await supabaseAdmin
                .from('conversations')
                .select('*')
                .eq('tenant_id', activeTenantId)
                .eq('client_number', clientNumber)
                .not('status', 'in', '("fechado","perdido")')
                .order('created_at', { ascending: false })
                .limit(1)

            let conversation = openConvs && openConvs.length > 0 ? openConvs[0] : null;

            let isNewConversation = false;
            if (!conversation) {
                isNewConversation = true;
                const { data: firstStage } = await supabaseAdmin.from('pipeline_stages').select('id').eq('tenant_id', activeTenantId).order('order', { ascending: true }).limit(1).single()
                const { data: newConv } = await supabaseAdmin.from('conversations').insert({
                    tenant_id: activeTenantId, client_id: clientId, client_number: clientNumber, client_name: pushName, status: 'bot', stage_id: firstStage?.id
                }).select('*').single()
                conversation = newConv
            }

            if (!conversation) throw new Error("Falha ao criar/obter conversa no banco.")

            await supabaseAdmin.from('messages').insert({ conversation_id: conversation.id, sender: 'client', content: messageContent })
            await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id)

            if (conversation.status === 'bot' || isNewConversation) {
                const { data: history } = await supabaseAdmin.from('messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: true })

                if (history) {
                    let aiResult = await generateAiResponse(history, activeTenantId as string, conversation.status)

                    // =========================================================================
                    // 🛠️ TOOL CALLING EXECUTION LOOP (O ROBÔ PEDIU PRA USAR UM SISTEMA)
                    // =========================================================================
                    if (aiResult.tool_calls && aiResult.tool_calls.length > 0) {
                        const toolCall = aiResult.tool_calls[0]

                        if (toolCall.function.name === 'check_availability') {
                            const args = JSON.parse(toolCall.function.arguments || '{}')
                            const targetDate = args.target_date // ex: 2024-12-25

                            console.log(`🔍 [TOOL] Consultando Agenda para: ${targetDate}`)

                            // 1. Busca no Banco os horários ocupados neste dia
                            const startOfDay = new Date(`${targetDate}T00:00:00-03:00`).toISOString()
                            const endOfDay = new Date(`${targetDate}T23:59:59-03:00`).toISOString()

                            const { data: appointments } = await supabaseAdmin
                                .from('appointments')
                                .select('start_time, end_time, title')
                                .eq('tenant_id', activeTenantId)
                                .in('status', ['scheduled'])
                                .gte('start_time', startOfDay)
                                .lte('start_time', endOfDay)
                                .order('start_time', { ascending: true })

                            const occupiedSlots = appointments?.map(a => {
                                const st = new Date(a.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                                const et = new Date(a.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                                return `- Ocupado das ${st} às ${et}`
                            }).join('\n') || 'Nenhum agendamento neste dia. A agenda está 100% livre!'

                            // 2. Monta o Retorno do Banco para a IA ler
                            const toolFeedbackMessage = `[RETORNO DO SISTEMA DE AGENDA PARA O DIA ${targetDate}]:\n${occupiedSlots}\nInstrução: Responda ao cliente com base nesta disponibilidade de forma humanizada.`

                            // 3. Forja o histórico virtual para a Groq ter contexto e devolve o texto final
                            const virtualHistory = [...history, { sender: 'user', content: toolFeedbackMessage } as any]
                            const aiFinalResult = await generateAiResponse(virtualHistory, activeTenantId as string, conversation.status)

                            aiResult = aiFinalResult // Sobrescreve pelo texto final humano
                        }
                        else if (toolCall.function.name === 'book_appointment') {
                            const args = JSON.parse(toolCall.function.arguments || '{}')

                            console.log(`📌 [TOOL] Agendando Consulta: ${args.title} para ${args.target_start}`)

                            // 1. Inserir no Banco de Dados
                            const { data: newAppointment, error: apptError } = await supabaseAdmin
                                .from('appointments')
                                .insert({
                                    tenant_id: activeTenantId,
                                    client_id: clientId,
                                    conversation_id: conversation.id,
                                    title: args.title,
                                    start_time: args.target_start,
                                    end_time: args.target_end,
                                    status: 'scheduled'
                                })
                                .select('id')
                                .single()

                            // 2. Feedback de Sucesso para a IA
                            const toolFeedbackMessage = apptError
                                ? `[RETORNO DO BANCO DE DADOS]: Falha ao tentar agendar. Erro: ${apptError.message}. Peça desculpas ao cliente.`
                                : `[RETORNO DO BANCO DE DADOS]: Sucesso Absoluto! O compromisso '${args.title}' foi cravado com sucesso no ID ${newAppointment?.id}. Instrução: Confirme o agendamento de forma super animada para o cliente no WhatsApp.`

                            // 3. Devolve para Groq gerar texto final
                            const virtualHistory = [...history, { sender: 'user', content: toolFeedbackMessage } as any]
                            const aiFinalResult = await generateAiResponse(virtualHistory, activeTenantId as string, conversation.status)

                            aiResult = aiFinalResult // Sobrescreve pelo texto final humano
                        }
                    }

                    let finalAiText = aiResult.text || "Desculpe, estou sobrecarregada estruturando a agenda. Tente novamente."
                    let nextStatus = 'bot'

                    if (finalAiText.includes('[ACTION:DESIGNER]')) {
                        nextStatus = 'designer'
                        finalAiText = finalAiText.replace('[ACTION:DESIGNER]', '').trim()

                        const { data: stages } = await supabaseAdmin.from('pipeline_stages').select('id').eq('tenant_id', activeTenantId).order('order', { ascending: true })
                        if (stages && stages.length >= 2) {
                            await supabaseAdmin.from('conversations').update({ status: nextStatus, stage_id: stages[1].id }).eq('id', conversation.id)
                        }
                    }

                    await supabaseAdmin.from('messages').insert({ conversation_id: conversation.id, sender: 'bot', content: finalAiText })

                    const evoUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
                    const evoKey = process.env.EVOLUTION_API_KEY || ''

                    try {
                        await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
                            method: 'POST',
                            body: JSON.stringify({ number: clientNumber, text: finalAiText }),
                            headers: { 'Content-Type': 'application/json', 'apikey': evoKey }
                        })
                    } catch (e) { console.error("Erro Evo API:", e) }
                }
            }

            return NextResponse.json({ status: 'processed', conversation_id: conversation.id }, { status: 200 })
        }

        return NextResponse.json({ status: 'ignored' }, { status: 200 })

    } catch (error: any) {
        console.error("Evolution Webhook Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
