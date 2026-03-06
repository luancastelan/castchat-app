'use server'

import { createClient } from '@/lib/supabase/server'

// Função auxiliar interna para pegar Inquilino Logado
async function getCurrentTenantInstanceName(type: 'public' | 'internal' = 'public') {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error("Não Autorizado")

    const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!userData?.tenant_id) throw new Error("Empresa não encontrada")

    // Retém compatibilidade anterior pro público ser só 'tenant-ID'
    const suffix = type === 'internal' ? '-internal' : ''
    return { instanceName: `tenant-${userData.tenant_id}${suffix}`, tenantId: userData.tenant_id }
}

export async function getWhatsAppStatus(type: 'public' | 'internal' = 'public') {
    try {
        const { instanceName } = await getCurrentTenantInstanceName(type)
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
        const apiKey = process.env.EVOLUTION_API_KEY

        if (!apiKey) return { error: 'Evolution API Key não configurada no servidor' }

        const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': apiKey },
            cache: 'no-store'
        })

        if (!response.ok) {
            if (response.status === 404) return { state: 'not_found' }
            return { error: `Erro na API: ${response.statusText}` }
        }

        const data = await response.json()
        return { state: data.instance?.state || 'disconnected' }
    } catch (e: any) {
        return { error: e.message || 'Servidor Evolution API indisponível.' }
    }
}

export async function connectWhatsApp(type: 'public' | 'internal' = 'public') {
    try {
        const { instanceName, tenantId } = await getCurrentTenantInstanceName(type)
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
        const apiKey = process.env.EVOLUTION_API_KEY as string

        let status = await getWhatsAppStatus(type)

        // Se não existe na Evolution, cria a Máquina Virtual Isolada e crava o Webhook!
        if (status.state === 'not_found') {
            const createRes = await fetch(`${apiUrl}/instance/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({
                    instanceName: instanceName,
                    qrcode: true,
                    integration: 'WHATSAPP-BAILEYS'
                })
            })
            const createData = await createRes.json()

            // Seta o Webhook nativo imediatamente
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sua-url-ngrok.ngrok-free.app'
            await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({
                    webhook: {
                        url: `${appUrl}/api/webhook/evolution`,
                        byEvents: false,
                        base64: false,
                        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"]
                    }
                })
            })

            if (createData?.qrcode?.base64) return { qrcode: createData.qrcode.base64 }
            if (createData?.base64) return { qrcode: createData.base64 }
            if (createData?.hash?.qrcode) return { qrcode: createData.hash.qrcode }

            status = await getWhatsAppStatus(type)
        }

        // Se está conectado ou desconectado, tentamos conectar pra pegar o QRCode
        if (status.state !== 'open') {
            const connectRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
                headers: { 'apikey': apiKey },
                cache: 'no-store'
            })

            const connectData = await connectRes.json()
            if (connectData?.base64) return { qrcode: connectData.base64 }
            if (connectData?.qrcode?.base64) return { qrcode: connectData.qrcode.base64 }

            // Fallback (API às vezes joga o Ticker do Code em 'connectionState')
            const stateRes = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
                headers: { 'apikey': apiKey },
                cache: 'no-store'
            })
            const stateData = await stateRes.json()
            if (stateData?.instance?.qrcode) return { qrcode: stateData.instance.qrcode }

            return { error: 'O servidor Evolution gerou a instância mas recusou a renderizar a Imagem QRCode. Atualize.' }
        }

        return { error: 'Não foi possível conectar. Instância já está conectada no Backend!' }

    } catch (e: any) {
        return { error: e.message }
    }
}

export async function disconnectWhatsApp(type: 'public' | 'internal' = 'public') {
    try {
        const { instanceName } = await getCurrentTenantInstanceName(type)
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
        const apiKey = process.env.EVOLUTION_API_KEY as string

        const res = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': apiKey }
        })

        if (!res.ok) return { error: `Erro ao desconectar: ${res.statusText}` }
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}
