-- Adicionando Metadados na Tabela de Conversas (Ordem de Serviço)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS service_type text,
ADD COLUMN IF NOT EXISTS client_type text,
ADD COLUMN IF NOT EXISTS delivery_date timestamp with time zone;

-- Criando Tabela para o Chat Corporativo (Equipe Interna)
CREATE TABLE IF NOT EXISTS public.internal_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE, -- Opcional, cria uma sala de chat PARA CADA O.S
    sender_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL, -- Se NULL, quer dizer que a IA Fiscalizadora quem mandou
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitando RLS para segurança Multi-Tenant no Chat
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants podem ler o proprio chat"
ON public.internal_messages FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE users.id = auth.uid()));

CREATE POLICY "Tenants podem mandar mensagem no chat"
ON public.internal_messages FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE users.id = auth.uid()));
