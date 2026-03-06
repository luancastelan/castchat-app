'use client'

import { useState } from 'react'
import { updateAgent, createAgent, deleteAgent } from './actions'
import { Settings, Save, X, Bot, ShieldAlert, Sparkles, AlertCircle, ToggleLeft, ToggleRight, Check, Plus, Trash2 } from 'lucide-react'

export interface AiAgent {
    id: string
    tenant_id: string
    name: string
    role: string
    system_prompt: string
    webhook_trigger: string | null
    temperature: number
    is_active: boolean
    is_system_default: boolean
}

export function AgentsManager({ initialAgents, tenantId }: { initialAgents: AiAgent[], tenantId: string }) {
    const [agents, setAgents] = useState<AiAgent[]>(initialAgents)
    // Se o ID for vazio '', significa que é um NOVO agente sendo criado. 
    const [editingAgent, setEditingAgent] = useState<Partial<AiAgent> | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    // Form states
    const [editName, setEditName] = useState('')
    const [editRole, setEditRole] = useState('custom')
    const [editPrompt, setEditPrompt] = useState('')
    const [editTemp, setEditTemp] = useState(0.3)
    const [editActive, setEditActive] = useState(true)

    const openEditModal = (agent: AiAgent) => {
        setEditingAgent(agent)
        setEditName(agent.name)
        setEditRole(agent.role)
        setEditPrompt(agent.system_prompt)
        setEditTemp(agent.temperature)
        setEditActive(agent.is_active)
        setSaveSuccess(false)
    }

    const handleCreateNew = () => {
        setEditingAgent({ id: '' }) // Gatilho de Novo
        setEditName('')
        setEditRole('custom')
        setEditPrompt('Você é um assistente da empresa...')
        setEditTemp(0.5)
        setEditActive(true)
        setSaveSuccess(false)
    }

    const closeEditModal = () => {
        setEditingAgent(null)
    }

    const handleSave = async () => {
        if (!editingAgent) return
        if (!editName.trim() || !editPrompt.trim()) return alert("Nome e Prompt são obrigatórios!")

        setIsSaving(true)
        setSaveSuccess(false)

        let res: any

        if (editingAgent.id) {
            // Editando existente (Obs: role nao é atualizado segundo a route anterior, apenas params basicos)
            const dataToUpdate = {
                name: editName,
                system_prompt: editPrompt,
                temperature: editTemp,
                is_active: editActive
            }
            res = await updateAgent(editingAgent.id, dataToUpdate)
            if (res?.success) {
                setAgents(prev => prev.map(a => a.id === editingAgent.id ? { ...a, ...dataToUpdate } as AiAgent : a))
            }
        } else {
            // Criando Novo Agente DO ZERO
            const dataToInsert = {
                tenant_id: tenantId,
                name: editName,
                role: editRole,
                system_prompt: editPrompt,
                temperature: editTemp,
                is_active: editActive,
                is_system_default: false
            }
            res = await createAgent(dataToInsert)
            if (res?.success && res.agent) {
                setAgents(prev => [...prev, res.agent as AiAgent])
            }
        }

        setIsSaving(false)
        if (res?.success) {
            setSaveSuccess(true)
            setTimeout(() => {
                closeEditModal()
            }, 1000)
        } else {
            alert(res?.error || "Erro desconhecido ao salvar")
        }
    }

    const handleDelete = async (agent: AiAgent) => {
        if (agent.is_system_default) return alert('Habilidades vitais do sistema não podem ser excluídas.')
        if (window.confirm(`Tem certeza que deseja DELETAR o(a) Agente Especializado: ${agent.name}? Isso é irreversível.`)) {
            const res = await deleteAgent(agent.id)
            if (res.success) {
                setAgents(prev => prev.filter(a => a.id !== agent.id))
            } else {
                alert("Erro ao excluir: " + res.error)
            }
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Força de Trabalho Ativa</h3>
                    <p className="text-xs text-gray-500">Você possui {agents.length} agente(s) em operação na gráfica.</p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Criar Novo Agente
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {agents.map(agent => (
                    <div key={agent.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all hover:shadow-md">
                        <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${agent.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {agent.role === 'reception' ? <Bot className="w-6 h-6" /> :
                                        agent.role === 'billing' ? <ShieldAlert className="w-6 h-6" /> :
                                            <Sparkles className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 leading-tight">{agent.name}</h3>
                                    <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mt-1">Especialidade: {agent.role}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agent.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {agent.is_active ? 'Online' : 'Desativado'}
                                </span>
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Comportamento (System Prompt)</h4>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 font-mono flex-1 border border-gray-100 overflow-hidden relative">
                                <p className="line-clamp-4 leading-relaxed">{agent.system_prompt}</p>
                                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs text-gray-500 font-medium">
                                <span>Criatividade (Temp): {agent.temperature}</span>
                                {agent.is_system_default && <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">Template Padrão</span>}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                            {!agent.is_system_default && (
                                <button
                                    onClick={() => handleDelete(agent)}
                                    className="p-2 border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Excluir Agente"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => openEditModal(agent)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <Settings className="w-4 h-4" />
                                Configurar Skill
                            </button>
                        </div>
                    </div>
                ))}

                {agents.length === 0 && (
                    <div className="col-span-full p-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhum Agente Encontrado</h3>
                        <p className="text-gray-500 mt-2">Os Agentes de Inteligência Artificial para a sua empresa não foram gerados.</p>
                    </div>
                )}
            </div>

            {/* EDIT MODAL */}
            {editingAgent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">{editingAgent.id ? 'Editar Skill' : 'Criar Nova Inteligência'}: {editingAgent.name || ''}</h2>
                                <p className="text-sm text-gray-500">Ajuste o comportamento do agente para a sua empresa.</p>
                            </div>
                            <button onClick={closeEditModal} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Pós-Venda Ativa"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role Específica</label>
                                    <select
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                        disabled={!!editingAgent.id}
                                        className={`w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 outline-none transition-all text-sm ${editingAgent.id ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'focus:ring-2 focus:ring-blue-500'}`}
                                    >
                                        <option value="reception">Recepcionista / Triagem (Padrão)</option>
                                        <option value="estimator">Orçamentista / Técnico</option>
                                        <option value="billing">Cobrança Humanizada</option>
                                        <option value="production">Relator de Produção</option>
                                        <option value="custom">Agente Especial (Customizado)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Diretriz Mestre (System Prompt)</label>
                                <p className="text-xs text-gray-500 mb-2">Este texto é o "Cérebro" da IA. Ele define as regras, limites, produtos, o tom de voz e como ela deve classificar os clientes. Seja minucioso e declare as regras numeradas.</p>
                                <textarea
                                    rows={10}
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-mono leading-relaxed"
                                />
                            </div>

                            <div className="flex gap-6 pt-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Grau de Criatividade (Temperature)</label>
                                    <p className="text-xs text-gray-500 mb-2">0.1 = Muito Robótico/Frio, 0.9 = Muito Criativo/Alucina Mais</p>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={editTemp}
                                        onChange={(e) => setEditTemp(parseFloat(e.target.value))}
                                        className="w-full accent-blue-600"
                                    />
                                    <div className="text-center font-bold text-blue-600 mt-1">{editTemp}</div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center items-center bg-gray-50 rounded-lg border border-gray-200 p-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status Operacional</label>
                                    <button
                                        onClick={() => setEditActive(!editActive)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${editActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                    >
                                        {editActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                        {editActive ? 'Agente Ativo e Respondendo' : 'Agente Desativado'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={closeEditModal}
                                disabled={isSaving}
                                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || saveSuccess}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-colors shadow-sm ${saveSuccess ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : saveSuccess ? (
                                    <><Check className="w-5 h-5" /> Salvo com Sucesso!</>
                                ) : (
                                    <><Save className="w-5 h-5" /> Salvar Configurações</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
