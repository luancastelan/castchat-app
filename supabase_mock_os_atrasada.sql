-- ====================================================================================
-- SCRIPT DE MOCK DE DADOS (TESTE DO ROBÔ FISCAL SEM PRECISAR CRIAR TUDO DO ZERO)
-- Instruções: Substitua o '5511999999999' pelo seu número de WhatsApp com DDD 
-- ====================================================================================

DO $$ 
DECLARE
    meu_tenant_id uuid;
    meu_user_id uuid;
    coluna_design_id uuid;
    novo_cliente_id uuid;
BEGIN
    -- 1. Pega o SEU Tenant e User (O Dono, Administrador raiz)
    SELECT tenant_id, id INTO meu_tenant_id, meu_user_id 
    FROM public.users 
    WHERE role = 'admin' 
    LIMIT 1;

    -- 2. Atualiza o Seu Telefone Comercial para a IA te marcar
    UPDATE public.users 
    SET business_phone = '17997082645' -- COLOQUE SEU WPP AQUI
    WHERE id = meu_user_id;

    -- 3. Pega a 1º Coluna da Sua Fábrica (Ex: "Design" ou "Em Atendimento")
    SELECT id INTO coluna_design_id 
    FROM public.production_stages 
    WHERE tenant_id = meu_tenant_id 
    ORDER BY "order" ASC 
    LIMIT 1;

    -- 4. Vincula o Seu WhatsApp pessoal (Como se fosse um DM invés de Grupo) à Coluna
    -- Assim o Robô acha que "Essa coluna avisa nesse numero"
    UPDATE public.production_stages
    SET whatsapp_group_id = '17997082645@s.whatsapp.net' -- Evolutio API DM Format
    WHERE id = coluna_design_id;

    -- 5. Cria um Cliente Falso para o CRM
    INSERT INTO public.clients (tenant_id, phone_number, name)
    VALUES (meu_tenant_id, '17997082645', 'Cliente Teste do Robô')
    RETURNING id INTO novo_cliente_id;

    -- 6. FORJA UMA O.S ATRASADA NA FÁBRICA (-2 Dias Atrás!)
    INSERT INTO public.conversations (
        tenant_id, 
        client_id, 
        client_number, 
        client_name, 
        assigned_user_id, 
        production_stage_id, 
        status, 
        service_type, 
        client_type, 
        delivery_date
    ) VALUES (
        meu_tenant_id, 
        novo_cliente_id, 
        '17997082645', 
        'Cliente Teste do Robô', 
        meu_user_id, -- A OS é SUAA (a IA vai te dar a bronca)
        coluna_design_id, -- Travado na 1º Coluna
        'designer', 
        'Lona FrontLight Urgente', 
        'PF', 
        current_date - 2 -- ESTÁ ATRASADO 48H!
    );

END $$;
