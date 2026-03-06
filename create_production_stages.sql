-- Tabela de Estágios de Produção (O Kanban Interno)
CREATE TABLE IF NOT EXISTS public.production_stages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant pode ver proprios estagios de producao" 
ON public.production_stages FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE users.id = auth.uid()));

-- Adicionando Relacionamento na Conversa (Ticket) para o Chão de Fábrica
-- NOTA: O 'stage_id' atual refere-se ao Funil Comercial (Novo, Atendimento, Fechado).
-- O 'production_stage_id' será exclusivo para quando a venda cai na Fábrica.
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS production_stage_id uuid REFERENCES public.production_stages(id) ON DELETE SET NULL;

-- Inserindo os Estagios de Produção Default para Tenants existentes
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN SELECT id FROM public.tenants LOOP
        IF NOT EXISTS (SELECT 1 FROM public.production_stages WHERE tenant_id = t.id) THEN
            INSERT INTO public.production_stages (tenant_id, name, "order") VALUES
            (t.id, 'Design (Fila)', 1),
            (t.id, 'Aprovação de Arte', 2),
            (t.id, 'Impressão (Máquina)', 3),
            (t.id, 'Acabamento', 4),
            (t.id, 'Pronto para Retirada', 5);
        END IF;
    END LOOP;
END $$;
