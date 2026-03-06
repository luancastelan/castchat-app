'use client'

import { useState, useEffect } from 'react'
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp } from './actions'
import { QrCode, Smartphone, RefreshCw, CheckCircle2, AlertCircle, LogOut, Bot, Store } from 'lucide-react'

// Componente Interno p/ Renderizar um Painel de Instância (Reutilizável)
function WhatsAppPanel({
    type,
    title,
    description,
    icon: Icon
}: {
    type: 'public' | 'internal',
    title: string,
    description: string,
    icon: any
}) {
    const [status, setStatus] = useState<string>('loading')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    useEffect(() => {
        checkStatus()
    }, [type])

    const checkStatus = async () => {
        try {
            const res = await getWhatsAppStatus(type)
            if (res.error) {
                setError(res.error)
                setStatus('error')
            } else {
                setStatus(res.state || 'disconnected')
            }
        } catch (e) {
            setError('Erro ao verificar status')
            setStatus('error')
        }
    }

    const handleConnect = async () => {
        setIsGenerating(true)
        setError(null)
        try {
            const res = await connectWhatsApp(type)
            if (res.error) {
                setError(res.error)
            } else if (res.qrcode) {
                const formattedQr = res.qrcode.startsWith('data:image')
                    ? res.qrcode
                    : `data:image/png;base64,${res.qrcode}`
                setQrCode(formattedQr)
                setStatus('connecting')
            }
        } catch (e) {
            setError('Falha ao gerar QR Code.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDisconnect = async () => {
        setIsDisconnecting(true)
        setError(null)
        try {
            const res = await disconnectWhatsApp(type)
            if (res.error) {
                setError(res.error)
            } else {
                setQrCode(null)
                setStatus('disconnected')
            }
        } catch (e) {
            setError('Falha ao desconectar aparelho.')
        } finally {
            setIsDisconnecting(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col p-6 min-h-[500px]">
            <div className="flex items-start gap-4 mb-6">
                <div className={`p-3 rounded-xl ${type === 'public' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-sm">Problema na Conexão</h4>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            <div className="bg-gray-50/80 mt-auto flex-1 rounded-xl border border-gray-100 flex flex-col items-center justify-center p-6 relative">
                {status === 'loading' && (
                    <div className="flex flex-col items-center text-gray-400">
                        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                        <p className="text-sm font-medium">Verificando Motor Evolution...</p>
                    </div>
                )}

                {status === 'open' && (
                    <div className="flex flex-col items-center text-green-600 outline-none">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold mb-1 text-gray-900">Aparelho Operante</h4>
                        <p className="text-green-700 font-medium text-center text-sm mb-6">
                            Sessão `{type}` está ativa e roterizando chamadas.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={checkStatus}
                                className="text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg"
                            >
                                Re-Checar
                            </button>
                            <button
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                                className="text-xs font-bold text-red-600 hover:bg-red-50 transition-colors px-4 py-2 border border-red-200 bg-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDisconnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                                {isDisconnecting ? 'Desligando...' : 'Desconectar Chip'}
                            </button>
                        </div>
                    </div>
                )}

                {(!qrCode && status !== 'open' && status !== 'loading') && (
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Smartphone className="w-8 h-8" />
                        </div>
                        <h4 className="text-base font-bold text-gray-900 mb-1">Aparelho Desconectado</h4>
                        <p className="text-xs text-gray-500 mb-6 max-w-[250px]">
                            Gere um QRCode de Emparelhamento via Evolution API.
                        </p>
                        <button
                            onClick={handleConnect}
                            disabled={isGenerating}
                            className={`font-semibold py-2.5 px-5 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-70 text-sm text-white ${type === 'public' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                        >
                            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                            {isGenerating ? 'Instanciando VM...' : 'Emparelhar Número'}
                        </button>
                    </div>
                )}

                {qrCode && status !== 'open' && (
                    <div className="flex flex-col items-center text-center">
                        <h4 className="text-sm font-bold text-gray-900 mb-1">Aponte a Câmera</h4>
                        <p className="text-xs text-gray-500 mb-4">
                            Em Aparelhos Conectados no seu Zap
                        </p>

                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 mb-5">
                            <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={checkStatus}
                                className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                            >
                                Já Escaneei
                            </button>
                            <button
                                onClick={handleConnect}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                            >
                                Recarregar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function WhatsAppSettings() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl">
            {/* Aparelho Público / Oficial */}
            <WhatsAppPanel
                type="public"
                title="Canal Público (Atendimento CRM)"
                description="O número principal da sua empresa. Atende Leads, abre Ordens de Serviço e agenda Clientes. Esse chip ficará logado nos PCs das suas vendedoras."
                icon={Store}
            />

            {/* Aparelho Interno / IA Gestão */}
            <WhatsAppPanel
                type="internal"
                title="Canal Gerencial (Diretoria & Equipe)"
                description="O WhatsApp da Inteligência Artificial. Ninguém vê essas mensagens a não ser os Funcionários credenciados. A IA exigirá o RG/Telefone Biométrico de quem falar com ela aqui."
                icon={Bot}
            />
        </div>
    )
}
