-- Ativar UUID extension
create extension if not exists "uuid-ossp";

-- 1. Tabela: Tenants (Empresas)
create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  plan text default 'free',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela: Users (Extensão/Perfil de Usuários vinculados ao auth.users e a um tenant)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text,
  role text check (role in ('admin', 'gerente', 'designer', 'producao')),
  whatsapp_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela: Pipeline Stages (Etapas do CRM customizáveis por tenant)
create table public.pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  "order" integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela: Conversations (As sessões de conversas do CRM/WhatsApp)
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  client_number text not null,
  client_name text,
  assigned_user_id uuid references public.users(id) on delete set null,
  stage_id uuid references public.pipeline_stages(id) on delete set null,
  status text check (status in ('bot', 'designer', 'aguardando_cliente', 'fechado', 'perdido')),
  last_message_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabela: Messages (Histórico de mensagens dentro de uma conversa)
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender text check (sender in ('client', 'bot', 'user')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HABILITAR ROW LEVEL SECURITY (RLS)
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- POLÍTICAS RLS BASEADAS EM TENANT_ID

-- Função auxiliar para obter o tenant_id do usuário logado
create or replace function public.get_auth_tenant_id()
returns uuid as $$
  select tenant_id from public.users where id = auth.uid();
$$ language sql security definer;

-- Usuários só podem ver registros da sua própria empresa (tenant_id)
create policy "Isolate Tenants" on public.tenants
  for all using (id = public.get_auth_tenant_id());

create policy "Isolate Users" on public.users
  for all using (tenant_id = public.get_auth_tenant_id());

create policy "Isolate Pipeline Stages" on public.pipeline_stages
  for all using (tenant_id = public.get_auth_tenant_id());

create policy "Isolate Conversations" on public.conversations
  for all using (tenant_id = public.get_auth_tenant_id());

-- Para Messages, a lógica usa a tabela pai (conversation) para verificar o tenant
create policy "Isolate Messages" on public.messages
  for all using (
    conversation_id in (
      select id from public.conversations where tenant_id = public.get_auth_tenant_id()
    )
  );

-- Permitir Inserção de um Novo Tenant/Usuário no momento de Cadastro (Bypassa RLS)
-- Isso precisará ser tratado no backend/edge com Service Role Key para cadastrar o primeiro admin da empresa

-- 6. Tabela: SLA Logs (Registros para Relatórios de Atrasos da IA Gerente)
create table public.sla_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  alert_type text default 'delay_1h',
  sent_to_manager boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sla_logs enable row level security;

create policy "Isolate SLA Logs" on public.sla_logs
  for all using (tenant_id = public.get_auth_tenant_id());
