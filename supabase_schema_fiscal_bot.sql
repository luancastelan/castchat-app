-- Script para Fase 4: O Agente Fiscal (Integração WhatsApp Grupos da Produção)

-- 1. Toda coluna da Fábrica agora pode ter um Grupo de WhatsApp atrelado
ALTER TABLE public.production_stages
ADD COLUMN IF NOT EXISTS whatsapp_group_id text;
COMMENT ON COLUMN public.production_stages.whatsapp_group_id IS 'ID do grupo do WPP da Evolution API ex: 1203630... @g.us';

-- 2. Tabela para a Inteligência Artificial não SPAMMAR o WhatsApp
-- A IA de 30/30 minutos checa atrasos. Se ela já deu a bronca 1x para aquela O.S naquele momento de atraso, ela não dará de novo.
CREATE TABLE IF NOT EXISTS public.sla_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    stage_id uuid NOT NULL REFERENCES public.production_stages(id) ON DELETE CASCADE,
    alert_level text NOT NULL, -- Ex: 'warning' (falta 2h), 'critical' (atrasou), 'manager' (passou 24h)
    message_sent text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sla_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view alerts of their tenant"
    ON public.sla_alerts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.tenant_id = sla_alerts.tenant_id
    ));

CREATE INDEX IF NOT EXISTS sla_alerts_conversation_id_idx ON public.sla_alerts(conversation_id);
