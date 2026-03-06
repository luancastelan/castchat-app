-- 7. Tabela: Clients (Base de Contatos / CRM Geral por Lojista)
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  phone_number text not null,
  name text,
  avatar_url text,
  notes text,
  total_spent numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (tenant_id, phone_number) 
);

-- HABILITAR ROW LEVEL SECURITY (RLS) PARA CLIENTS
alter table public.clients enable row level security;

-- POLÍTICAS RLS (Isolamento Multi-Tenant)
create policy "Isolate Clients" on public.clients
  for all using (tenant_id = public.get_auth_tenant_id());

-- ALTERAR A TABELA CONVERSATIONS PARA VINCULAR O CLIENTE ESTRUTURADO
alter table public.conversations add column client_id uuid references public.clients(id) on delete set null;
