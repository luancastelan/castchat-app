-- O Supabase Auth já guarda o e-mail, mas para o CRUD (a listagem da nossa tabela Equipe)
-- Precisamos dessa coluna explicitamente dentro de public.users.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email text;

-- Documentando a coluna
COMMENT ON COLUMN public.users.email IS 'Email transacional replicado do Auth para consulta rapida no painel de equipe/rh';
