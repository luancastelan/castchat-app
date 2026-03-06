'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, FileText, UserRound } from 'lucide-react'
import { createAppointment } from './actions'
import { getClients } from '../clientes/actions' // Reutilizando action da tabela clientes
import { Client } from '@/types/database'

interface NewAppointmentModalProps {
    onClose: () => void
    onSuccess: () => void
}

export function NewAppointmentModal({ onClose, onSuccess }: NewAppointmentModalProps) {
    const [clients, setClients] = useState<Client[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [selectedClientId, setSelectedClientId] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')

    useEffect(() => {
        loadClients()
    }, [])

    const loadClients = async () => {
        const res = await getClients()
        if (res.data) setClients(res.data)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!selectedClientId) return setError("Selecione um cliente.")
        if (!date || !startTime || !endTime) return setError("Data e horários são obrigatórios.")

        // Concatena data com as horas para ISO 8601 (UTC local context simplificado para o BD)
        const startIso = new Date(`${date}T${startTime}:00`).toISOString()
        const endIso = new Date(`${date}T${endTime}:00`).toISOString()

        setIsLoading(true)
        const res = await createAppointment({
            clientId: selectedClientId,
            title,
            description,
            startTime: startIso,
            endTime: endIso
        })
        setIsLoading(false)

        if (res.error) {
            setError(res.error)
        } else {
            onSuccess()
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 transform transition-all">
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Agendar Horário
                    </h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Cliente */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Cidadão / Contato</label>
                        <div className="relative">
                            <UserRound className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
                            <select
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                                required
                            >
                                <option value="" disabled>Selecione quem fará o procedimento...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name || c.phone_number}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Título */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Título do Agendamento</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Reunião Avaliação, Restauração Dente..."
                            className="w-full px-4 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                        />
                    </div>

                    {/* Data e Horas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Data</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Início</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-2 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Fim</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full px-2 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Observações Operacionais (Opcional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Instruções para a equipe de recepção ou fábrica..."
                            className="w-full h-24 px-4 py-3 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition shadow disabled:opacity-75">
                            {isLoading ? 'Checando...' : 'Confirmar Agenda'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    )
}
