-- 9. Tabela: Financial Transactions (Módulo de Gestão Financeira e Caixa)
create table public.financial_transactions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  description text not null,
  amount numeric(10, 2) not null,
  status text check (status in ('paid', 'pending', 'late')) not null default 'pending',
  payment_method text check (payment_method in ('pix', 'credit_card', 'debit_card', 'cash', 'installments', 'billet')) not null,
  installments integer default 1,
  due_date timestamp with time zone not null,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HABILITAR ROW LEVEL SECURITY (RLS) PARA TRANSAÇÕES FINANCEIRAS
alter table public.financial_transactions enable row level security;

-- POLÍTICAS RLS (Isolamento Multi-Tenant)
-- Nota: A limitação de visualização apenas para Admins será rigidamente aplicada no Back-End (Server Actions) e na UI.
create policy "Isolate Financial Transactions" on public.financial_transactions
  for all using (tenant_id = public.get_auth_tenant_id());
