'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Calendar, Clock, MapPin, UserRound, ArrowRight } from 'lucide-react'
import { getAppointments, updateAppointmentStatus } from './actions'
import { Appointment } from '@/types/database'
import { NewAppointmentModal } from './NewAppointmentModal'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ExtendedAppointment = Appointment & {
    clients: {
        id: string
        name: string | null
        phone_number: string
        avatar_url: string | null
    }
}

export default function AgendaPage() {
    const [appointments, setAppointments] = useState<ExtendedAppointment[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isNewModalOpen, setIsNewModalOpen] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const res = await getAppointments()
        if (res.error) setError(res.error)
        else setAppointments(res.data || [])
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-700'
            case 'completed': return 'bg-emerald-100 text-emerald-700'
            case 'canceled': return 'bg-red-100 text-red-700'
            case 'no_show': return 'bg-orange-100 text-orange-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'scheduled': return 'Agendado'
            case 'completed': return 'Concluído'
            case 'canceled': return 'Cancelado'
            case 'no_show': return 'Faltou'
            default: return 'Desconhecido'
        }
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            <div className="flex-1 bg-gray-50/50 flex flex-col min-w-0 border-l border-gray-200">
                {/* Cabeçalho */}
                <div className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-gray-900">Calendário de Consultas</h2>
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {appointments.length} Eventos
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsNewModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Agendamento
                        </button>
                    </div>
                </div>

                {/* Área Scrollável (Listagem Estilo Schedule) */}
                <div className="flex-1 overflow-auto p-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl mb-6 font-medium text-sm">
                            Falha ao carregar grade: {error}
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto space-y-4">
                        {appointments.length === 0 ? (
                            <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl mx-auto">
                                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">Agenda Livre</h3>
                                <p className="text-gray-500 mt-2">Nenhum procedimento ou consulta marcada.</p>
                                <button
                                    onClick={() => setIsNewModalOpen(true)}
                                    className="mt-6 px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition"
                                >
                                    Criar o primeiro
                                </button>
                            </div>
                        ) : (
                            appointments.map(apt => {
                                const start = parseISO(apt.start_time)
                                const end = parseISO(apt.end_time)

                                return (
                                    <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow flex gap-6">
                                        {/* Coluna da Esquerda (Data/Hora) */}
                                        <div className="flex flex-col items-center justify-center min-w-[120px] px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                                {format(start, 'MMM', { locale: ptBR })}
                                            </span>
                                            <span className="text-3xl font-black text-gray-900 leading-none my-1">
                                                {format(start, 'dd')}
                                            </span>
                                            <span className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {format(start, 'HH:mm')}
                                            </span>
                                        </div>

                                        {/* Miolo (Infos) */}
                                        <div className="flex-1 py-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                                    {apt.title}
                                                </h3>
                                                <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${getStatusColor(apt.status)}`}>
                                                    {getStatusText(apt.status)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 font-medium">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                    {apt.clients?.name ? apt.clients.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                {apt.clients?.name || 'Desconhecido'}
                                                <span className="text-gray-300">•</span>
                                                <span className="text-gray-500">{apt.clients?.phone_number}</span>
                                            </div>

                                            {apt.description && (
                                                <p className="text-sm text-gray-500 line-clamp-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    {apt.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Ações / Status Change */}
                                        <div className="flex flex-col justify-center gap-2 border-l border-gray-100 pl-6 ml-2">
                                            {apt.status === 'scheduled' && (
                                                <>
                                                    <button
                                                        onClick={() => { updateAppointmentStatus(apt.id, 'completed'); loadData(); }}
                                                        className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-center"
                                                    >
                                                        Concluir
                                                    </button>
                                                    <button
                                                        onClick={() => { updateAppointmentStatus(apt.id, 'no_show'); loadData(); }}
                                                        className="px-4 py-2 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-center"
                                                    >
                                                        Faltou
                                                    </button>
                                                    <button
                                                        onClick={() => { updateAppointmentStatus(apt.id, 'canceled'); loadData(); }}
                                                        className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-center"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {isNewModalOpen && (
                <NewAppointmentModal
                    onClose={() => setIsNewModalOpen(false)}
                    onSuccess={loadData}
                />
            )}
        </div>
    )
}
