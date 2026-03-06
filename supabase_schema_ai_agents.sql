-- Create ai_agents table
CREATE TABLE public.ai_agents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    role text NOT NULL, -- reception, estimator, billing, production, custom
    system_prompt text NOT NULL,
    webhook_trigger text,
    temperature numeric DEFAULT 0.3 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_system_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI agents of their tenant"
    ON public.ai_agents FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.tenant_id = ai_agents.tenant_id
    ));

CREATE POLICY "Users can create AI agents for their tenant"
    ON public.ai_agents FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.tenant_id = ai_agents.tenant_id
    ));

CREATE POLICY "Users can update AI agents of their tenant"
    ON public.ai_agents FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.tenant_id = ai_agents.tenant_id
    ));

CREATE POLICY "Admins can delete custom AI agents"
    ON public.ai_agents FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.tenant_id = ai_agents.tenant_id AND users.role = 'admin'
        )
        AND is_system_default = false
    );
