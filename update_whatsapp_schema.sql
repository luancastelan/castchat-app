-- Atualizando a tabela production_stages para suportar IDs de grupos de WhatsApp (Evolution API)
ALTER TABLE public.production_stages
ADD COLUMN IF NOT EXISTS whatsapp_group_id text;

-- Atualizando a tabela users para suportar o numero de WhatsApp do Funcionario
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS whatsapp_number text;
