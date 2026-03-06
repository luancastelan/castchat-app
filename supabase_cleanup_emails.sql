-- Execute este Script no SQL Editor do Supabase para APAGAR PERMANENTEMENTE 
-- os e-mails "fantasmas" que foram gerados durante os erros de teste, 
-- permitindo que você possa usá-los novamente no Setup Mágico!

DELETE FROM auth.users 
WHERE email IN (
    'luankaiquecastelan@gmail.com', 
    'luancastellan.composicao@gmail.com'
);

-- NOTA: Como eles não têm Lojas (Tenants) associadas no banco público, 
-- isso não apagará nenhum dado do seu CRM. Ele apenas libera os E-mails pro Auth!
