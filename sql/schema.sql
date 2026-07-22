-- Cole isto no Supabase: painel > SQL Editor > New query > Run.
-- Cria a tabela de salas e liga o realtime. É seguro rodar de novo.

create table if not exists public.rooms (
  code       text primary key,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

-- Jogo de festa: qualquer um com o código pode ler/criar/atualizar a sala.
-- (Baixo risco; nenhuma informação sensível fica aqui.)
drop policy if exists "rooms_select" on public.rooms;
drop policy if exists "rooms_insert" on public.rooms;
drop policy if exists "rooms_update" on public.rooms;
create policy "rooms_select" on public.rooms for select using (true);
create policy "rooms_insert" on public.rooms for insert with check (true);
create policy "rooms_update" on public.rooms for update using (true) with check (true);

-- Realtime: avisa os clientes quando o state muda.
alter publication supabase_realtime add table public.rooms;

-- Faxina automática opcional: apaga salas paradas há mais de 1 dia.
-- (Descomente se quiser e tiver a extensão pg_cron ativa.)
-- select cron.schedule('limpa_salas','0 5 * * *',$$ delete from public.rooms where updated_at < now() - interval '1 day' $$);
