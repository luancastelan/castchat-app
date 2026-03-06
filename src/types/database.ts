export type Client = {
    id: string
    tenant_id: string
    phone_number: string
    name: string | null
    avatar_url: string | null
    notes: string | null
    total_spent: number
    created_at: string
}

export type PipelineStage = {
    id: string
    tenant_id: string
    name: string
    order: number
}

export type ProductionStage = {
    id: string
    tenant_id: string
    name: string
    order: number
    whatsapp_group_id: string | null
}

export type Conversation = {
    id: string
    tenant_id: string
    client_id: string | null
    client_number: string
    client_name: string | null
    assigned_user_id: string | null
    stage_id: string | null
    production_stage_id: string | null
    status: 'bot' | 'designer' | 'aguardando_cliente' | 'fechado' | 'perdido' | 'producao' | null
    service_type: string | null
    client_type: string | null
    delivery_date: string | null
    last_message_at: string
    created_at: string
}

export type InternalMessage = {
    id: string
    tenant_id: string
    conversation_id: string | null
    sender_user_id: string | null
    content: string
    created_at: string
}

export type Message = {
    id: string
    conversation_id: string
    sender: 'client' | 'bot' | 'user'
    content: string
    created_at: string
}

export type User = {
    id: string
    tenant_id: string | null
    email: string
    name: string | null
    role: 'admin' | 'manager' | 'employee'
    business_phone: string | null
    ai_instructions: string | null
    created_at: string
}

export type Appointment = {
    id: string
    tenant_id: string
    client_id: string
    conversation_id: string | null
    title: string
    description: string | null
    start_time: string
    end_time: string
    status: 'scheduled' | 'completed' | 'canceled' | 'no_show'
    created_at: string
}

export type FinancialTransaction = {
    id: string
    tenant_id: string
    client_id: string | null
    conversation_id: string | null
    description: string
    amount: number
    status: 'paid' | 'pending' | 'late'
    payment_method: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'installments' | 'billet'
    installments: number
    due_date: string
    paid_at: string | null
    created_at: string
}

