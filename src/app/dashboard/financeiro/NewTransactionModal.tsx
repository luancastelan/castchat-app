'use client'

import { useState, useEffect } from 'react'
import { X, Search, FileText, UserRound, DollarSign, Calendar, CreditCard } from 'lucide-react'
import { createTransaction } from './actions'
import { getClients } from '../clientes/actions'
import { Client } from '@/types/database'

interface NewTransactionModalProps {
    onClose: () => void
    onSuccess: () => void
}

export function NewTransactionModal({ onClose, onSuccess }: NewTransactionModalProps) {
    const [clients, setClients] = useState<Client[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [description, setDescription] = useState('')
    const [amount, setAmount] = useState('')
    const [status, setStatus] = useState('pending')
    const [paymentMethod, setPaymentMethod] = useState('pix')
    const [dueDate, setDueDate] = useState('')
    const [selectedClientId, setSelectedClientId] = useState('')

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

        if (!description || !amount || !dueDate) {
            return setError("Descrição, Valor e Data de Vencimento são obrigatórios.")
        }

        const numericAmount = parseFloat(amount.replace(',', '.'))
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return setError("Valor numérico inválido.")
        }

        // Se pago agora, salva hora de pagamento.
        const isPaid = status === 'paid'
        const baseIsoDate = new Date(`${dueDate}T12:00:00`).toISOString()

        setIsLoading(true)
        const res = await createTransaction({
            client_id: selectedClientId || null,
            description,
            amount: numericAmount,
            status: status as any,
            payment_method: paymentMethod as any,
            due_date: baseIsoDate,
            paid_at: isPaid ? new Date().toISOString() : null
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
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Lançar Receita/Cobrança
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

                    {/* Descricao / Valor */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ex: Restauração Resina / Banner Lona"
                                    className="w-full pl-10 pr-4 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Valor (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm md:text-base font-bold text-gray-900"
                                required
                            />
                        </div>
                    </div>

                    {/* Cliente */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente Vinculado (Opcional)</label>
                        <div className="relative">
                            <UserRound className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
                            <select
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="">Sem vínculo (Lançamento Avulso)</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name || c.phone_number}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Método de Pagamento e Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Status da Receita</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                            >
                                <option value="pending">🟡 Pendente (A Receber)</option>
                                <option value="paid">🟢 Liquidado (Pago as {new Date().toLocaleTimeString().slice(0, 5)})</option>
                                <option value="late">🔴 Vencido / Atrasado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Forma Pagamento</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="pix">PIX</option>
                                    <option value="credit_card">Cartão de Crédito</option>
                                    <option value="debit_card">Cartão de Débito</option>
                                    <option value="cash">Dinheiro em Espécie</option>
                                    <option value="billet">Boleto Bancário</option>
                                    <option value="installments">Parcelado Crediário</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Vencimento */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Data de Vencimento/Acerto</label>
                        <div className="relative w-1/2">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 outline-none border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-700"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-6 mt-6 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition shadow disabled:opacity-75 flex items-center gap-2">
                            {isLoading ? 'Registrando...' : 'Gravar no Caixa'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    )
}
