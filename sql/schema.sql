-- Schema completo do banco (JÁ APLICADO no projeto Supabase "gamenight").
-- Guardado aqui só como documentação/backup. É seguro rodar de novo.

create table if not exists public.rooms (
  code       text primary key,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

-- Jogo de festa: qualquer um com o código pode ler/criar/atualizar/apagar a sala.
drop policy if exists "rooms_select" on public.rooms;
drop policy if exists "rooms_insert" on public.rooms;
drop policy if exists "rooms_update" on public.rooms;
drop policy if exists "rooms_delete" on public.rooms;
create policy "rooms_select" on public.rooms for select using (true);
create policy "rooms_insert" on public.rooms for insert with check (true);
create policy "rooms_update" on public.rooms for update using (true) with check (true);
create policy "rooms_delete" on public.rooms for delete using (true);

-- Realtime: avisa os clientes quando o state muda.
-- (dá erro inofensivo se a tabela já estiver na publicação)
alter publication supabase_realtime add table public.rooms;

-- ===================== PROTEÇÕES =====================

-- só aceita código de 4 letras/números maiúsculos
alter table public.rooms drop constraint if exists rooms_code_formato;
alter table public.rooms add constraint rooms_code_formato check (code ~ '^[A-Z0-9]{4}$');

-- estado de uma sala nunca passa de 100KB
alter table public.rooms drop constraint if exists rooms_state_tamanho;
alter table public.rooms add constraint rooms_state_tamanho check (pg_column_size(state) < 102400);

-- anti-spam: no máximo 30 salas novas a cada 10 min, e 500 salas no total
create or replace function public.rooms_freio_criacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.rooms) >= 500 then
    raise exception 'limite de salas atingido, tente mais tarde';
  end if;
  if (select count(*) from public.rooms where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'muitas salas criadas agora, aguarde um pouco';
  end if;
  return new;
end $$;

drop trigger if exists rooms_freio_criacao on public.rooms;
create trigger rooms_freio_criacao before insert on public.rooms
  for each row execute function public.rooms_freio_criacao();

-- faxina automática: toda hora, apaga salas paradas há mais de 12 horas
create extension if not exists pg_cron;
select cron.schedule('limpa_salas_paradas', '17 * * * *',
  $$delete from public.rooms where updated_at < now() - interval '12 hours'$$);
