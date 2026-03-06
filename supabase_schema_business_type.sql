-- Adiciona a coluna que define qual o "Template" da Loja (Nicho)
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'grafica';

-- Documenta a Coluna para ajudar outros devs
COMMENT ON COLUMN public.tenants.business_type IS 'A vertical de negócio/nicho dessa loja (ex: clinica, restaurante, advocacia, grafica)';
