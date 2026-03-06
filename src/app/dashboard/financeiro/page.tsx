'use client'

import { useState, useEffect } from 'react'
import { getFinancialTransactions, getFinancialMetrics } from './actions'
import { Plus, Search, DollarSign, TrendingUp, AlertCircle, CalendarClock, UserRound } from 'lucide-react'
import { FinancialTransaction } from '@/types/database'
import { NewTransactionModal } from './NewTransactionModal'

export default function FinanceiroPage() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [metrics, setMetrics] = useState({ totalPaid: 0, totalPending: 0, totalLate: 0 })
    const [error, setError] = useState<string | null>(null)
    const [isNewModalOpen, setIsNewModalOpen] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const [resTransactions, resMetrics] = await Promise.all([
            getFinancialTransactions(),
            getFinancialMetrics()
        ])

        if (resTransactions.error) setError(resTransactions.error)
        else setTransactions(resTransactions.data || [])

        if (resMetrics.metrics) setMetrics(resMetrics.metrics)
    }

    const formatBRL = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg bg-emerald-100 text-emerald-700">Pago</span>
            case 'pending': return <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg bg-yellow-100 text-yellow-700">Aguardando</span>
            case 'late': return <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg bg-red-100 text-red-700">Atrasado</span>
            default: return <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg bg-gray-100 text-gray-700">Desconhecido</span>
        }
    }

    const getMethodDisplay = (method: string) => {
        const methods: Record<string, string> = {
            pix: 'PIX',
            credit_card: 'Cartão de Crédito',
            debit_card: 'Cartão de Débito',
            cash: 'Dinheiro',
            installments: 'Parcelado',
            billet: 'Boleto'
        }
        return methods[method] || method
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-gray-100 max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 space-y-6">

                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">Painel Financeiro</h2>
                        <p className="text-sm text-gray-500 mt-1">Gestão de caixa e faturamentos por Cliente</p>
                    </div>
                    <button
                        onClick={() => setIsNewModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Lançar Receita
                    </button>
                </div>

                {/* KPI Cards (Cards de Métricas) */}
                <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-tight">Receita Liquidada</span>
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900">{formatBRL(metrics.totalPaid)}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-tight">A Receber</span>
                            <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                                <CalendarClock className="w-5 h-5 text-yellow-600" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900">{formatBRL(metrics.totalPending)}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <div className="relative z-10 flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-tight">Inadimplência</span>
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                        </div>
                        <h3 className="relative z-10 text-3xl font-black text-gray-900">{formatBRL(metrics.totalLate)}</h3>
                    </div>
                </div>

                {/* Tabela de Transações */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-8">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <h3 className="text-lg font-bold text-gray-900">Histórico de Movimentações</h3>
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Procurar transação..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                            />
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="px-6 py-4">Descrição Base</th>
                                <th className="px-6 py-4">Cliente / Contato</th>
                                <th className="px-6 py-4">Status & Método</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4 text-right">Valor R$</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        Caixa limpo. Nenhuma receita cadastrada neste SaaS.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{t.description}</div>
                                            {t.conversations?.title && (
                                                <div className="text-xs text-gray-400 mt-0.5">O.S: {t.conversations.title}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {t.clients ? (
                                                <div className="flex items-center gap-2">
                                                    <UserRound className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-semibold text-gray-700">{t.clients.name || t.clients.phone_number}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Lançamento Avulso</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                {getStatusBadge(t.status)}
                                                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">{getMethodDisplay(t.payment_method)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                            {new Date(t.due_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-base font-black ${t.status === 'paid' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                {formatBRL(t.amount)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isNewModalOpen && (
                <NewTransactionModal
                    onClose={() => setIsNewModalOpen(false)}
                    onSuccess={loadData}
                />
            )}
        </div>
    )
}
