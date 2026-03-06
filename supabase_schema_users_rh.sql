-- 10. Atualização da Tabela Users (Para Fase 10 - Chat Interno RH/Biometria Zap)
-- Adiciona os campos de Telefone Comercial e Instruções da Inteligência artificial por Funcionário.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS business_phone text,
ADD COLUMN IF NOT EXISTS ai_instructions text;

-- Explicação:
-- business_phone: O número de WhatsApp do funcionário (ex: 5511999999999) 
-- ai_instructions: O Lojista ditará o "Poder" da IA. Ex: "Ele só pode visualizar O.S de Design".
