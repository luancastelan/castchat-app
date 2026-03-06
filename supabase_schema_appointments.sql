-- 8. Tabela: Appointments (Agendamentos / Calendário do Lojista)
create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  conversation_id uuid references public.conversations(id) on delete set null,
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text check (status in ('scheduled', 'completed', 'canceled', 'no_show')) default 'scheduled',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HABILITAR ROW LEVEL SECURITY (RLS) PARA APPOINTMENTS
alter table public.appointments enable row level security;

-- POLÍTICAS RLS (Isolamento Multi-Tenant)
create policy "Isolate Appointments" on public.appointments
  for all using (tenant_id = public.get_auth_tenant_id());
