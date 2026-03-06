-- Tabela de Agentes de IA customizáveis por Tenant
CREATE TABLE IF NOT EXISTS public.ai_agents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    role text NOT NULL, -- Enum: 'reception', 'estimator', 'billing', 'production', 'custom'
    system_prompt text NOT NULL,
    webhook_trigger text, -- Gatilho de acionamento (ex: nome do stage) ou nulo
    temperature numeric DEFAULT 0.3,
    is_active boolean DEFAULT true,
    is_system_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar a Row Level Security (RLS) baseada em Tenants
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- Politica 1: Leitura restrita ao proprio Tenant
CREATE POLICY "Tenant pode ver proprios agentes" 
ON public.ai_agents FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE users.id = auth.uid()));

-- Politica 2: Criação restrita ao proprio Tenant
CREATE POLICY "Tenant pode criar agentes" 
ON public.ai_agents FOR INSERT 
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE users.id = auth.uid()));

-- Politica 3: Update restrito ao proprio Tenant
CREATE POLICY "Tenant pode atualizar proprios agentes" 
ON public.ai_agents FOR UPDATE 
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE users.id = auth.uid()));

-- Politica 4: Delete restrito ao proprio Tenant
CREATE POLICY "Tenant pode deletar proprios agentes" 
ON public.ai_agents FOR DELETE 
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE users.id = auth.uid()));

-- Insert Seeds for Existing Tenants
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN SELECT id FROM public.tenants LOOP
        -- Verificar se o tenant já possui o agente Recepcionista
        IF NOT EXISTS (SELECT 1 FROM public.ai_agents WHERE tenant_id = t.id AND role = 'reception') THEN
            INSERT INTO public.ai_agents (tenant_id, name, role, system_prompt, is_system_default)
            VALUES (
                t.id, 
                'Recepcionista de Triagem', 
                'reception', 
                'Você é a Assistente Virtual da CastChat, uma empresa premium de Comunicação Visual. Seu objetivo é encantar e classificar o pedido do cliente com EXTREMA cordialidade. Seja sempre muito educada, calorosa e atenciosa. NUNCA dê preços. Se o cliente pedir um material genérico, PERGUNTE simpaticamente as medidas e se ele já possui a arte. Mantenha respostas curtas. Se o cliente JÁ DISSE as medidas OU quer um orçamento, diga que vai enviar para a equipe de Criação e termine pulando uma linha com a tag oculta [ACTION:DESIGNER] apenas.',
                true
            );
        END IF;

        -- Orçamentista Técnico
        IF NOT EXISTS (SELECT 1 FROM public.ai_agents WHERE tenant_id = t.id AND role = 'estimator') THEN
            INSERT INTO public.ai_agents (tenant_id, name, role, system_prompt, is_system_default)
            VALUES (
                t.id, 
                'Assistente Orçamentista', 
                'estimator', 
                'Você é um orçamentista técnico da gráfica. O cliente foi enviado a você pois já possui as medidas e informações. Você deve calcular valores e repassar. Sua linguagem é técnica mas direta. [A ser implementado com ferramentas de cálculo]',
                true
            );
        END IF;

        -- Cobrança Humanizada
        IF NOT EXISTS (SELECT 1 FROM public.ai_agents WHERE tenant_id = t.id AND role = 'billing') THEN
            INSERT INTO public.ai_agents (tenant_id, name, role, system_prompt, is_system_default)
            VALUES (
                t.id, 
                'Conciliador Financeiro', 
                'billing', 
                'Você é um conciliador de pagamentos elegante. Aborde o cliente de forma empática sobre títulos em aberto. "Oi [Nome], tudo bem? Sei da correria do dia a dia, vim só te dar um alô sobre aquele fechamento do projeto..."',
                true
            );
        END IF;

    END LOOP;
END $$;
