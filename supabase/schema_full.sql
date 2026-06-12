-- =============================================================
-- schema_full.sql — rotas-flow (0001 a 0004 concatenadas)
-- Cole TUDO no SQL Editor do Supabase e clique em Run.
-- Gerado a partir das migrations/ — não edite à mão.
-- =============================================================


-- >>>>>>>>>>>>>>>>>>>> migrations/0001_schema.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0001_schema.sql — Tipos, tabelas e índices do MVP rotas-flow
-- =============================================================================
-- Modelo: Passageiro / Motorista / Admin compartilhando rotas e viagens.
-- Decisões do MVP:
--   * Aprovação de solicitação: motorista (dono da viagem) OU admin.
--   * Disponibilidade por DATA específica cria a viagem (trip) automaticamente
--     via trigger (ver 0002_functions_triggers.sql).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('passenger', 'driver', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trip_status as enum ('open', 'full', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- profiles — 1:1 com auth.users (criado por trigger no signup)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null,
  role        public.user_role not null default 'passenger',
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- drivers — dados do veículo / aprovação do motorista
-- -----------------------------------------------------------------------------
create table if not exists public.drivers (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null unique references public.profiles (id) on delete cascade,
  phone          text,
  vehicle_model  text,
  vehicle_plate  text,
  vehicle_color  text,
  seat_count     int not null default 4 check (seat_count > 0),
  is_approved    boolean not null default false,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- routes — rotas cadastradas pelo admin
-- -----------------------------------------------------------------------------
create table if not exists public.routes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  origin       text not null,
  destination  text not null,
  description  text,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- driver_availability — disponibilidade do motorista
--   weekday: recorrência semanal (0=domingo..6=sábado) — reservado p/ futuro
--   date:    data específica (usado no MVP) → dispara criação da trip
--   Regra: exatamente um entre (weekday, date) deve estar preenchido.
-- -----------------------------------------------------------------------------
create table if not exists public.driver_availability (
  id               uuid primary key default gen_random_uuid(),
  driver_id        uuid not null references public.drivers (id) on delete cascade,
  route_id         uuid not null references public.routes (id) on delete cascade,
  weekday          smallint check (weekday between 0 and 6),
  date             date,
  departure_time   time not null,
  available_seats  int not null check (available_seats > 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint driver_availability_recurrence_chk
    check ((weekday is null) <> (date is null))
);

-- -----------------------------------------------------------------------------
-- trips — viagens abertas para um dia específico
--   availability_id: origem (quando criada automaticamente). Único p/ evitar
--   duplicação ao reinserir a mesma disponibilidade.
-- -----------------------------------------------------------------------------
create table if not exists public.trips (
  id               uuid primary key default gen_random_uuid(),
  route_id         uuid not null references public.routes (id) on delete cascade,
  driver_id        uuid not null references public.drivers (id) on delete cascade,
  availability_id  uuid unique references public.driver_availability (id) on delete set null,
  trip_date        date not null,
  departure_time   time not null,
  total_seats      int not null check (total_seats > 0),
  available_seats  int not null check (available_seats >= 0),
  status           public.trip_status not null default 'open',
  created_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- trip_requests — solicitações de vaga dos passageiros
-- -----------------------------------------------------------------------------
create table if not exists public.trip_requests (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  passenger_id  uuid not null references public.profiles (id) on delete cascade,
  status        public.request_status not null default 'pending',
  created_at    timestamptz not null default now(),
  approved_at   timestamptz,
  unique (trip_id, passenger_id)
);

-- -----------------------------------------------------------------------------
-- Índices para os filtros mais comuns do app
-- -----------------------------------------------------------------------------
create index if not exists idx_drivers_profile          on public.drivers (profile_id);
create index if not exists idx_routes_active            on public.routes (is_active);
create index if not exists idx_availability_driver      on public.driver_availability (driver_id);
create index if not exists idx_availability_route_date  on public.driver_availability (route_id, date);
create index if not exists idx_trips_driver             on public.trips (driver_id);
create index if not exists idx_trips_route_date         on public.trips (route_id, trip_date);
create index if not exists idx_trips_date_status        on public.trips (trip_date, status);
create index if not exists idx_requests_trip            on public.trip_requests (trip_id);
create index if not exists idx_requests_passenger       on public.trip_requests (passenger_id);

-- >>>>>>>>>>>>>>>>>>>> migrations/0002_functions_triggers.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0002_functions_triggers.sql — Funções auxiliares, automações e triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers de autorização (SECURITY DEFINER p/ evitar recursão nas policies)
-- -----------------------------------------------------------------------------

-- É admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- O usuário logado é o motorista deste driver_id?
create or replace function public.owns_driver(_driver_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.drivers
    where id = _driver_id and profile_id = auth.uid()
  );
$$;

-- O usuário logado é o motorista responsável por esta viagem?
create or replace function public.owns_trip(_trip_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.trips t
    join public.drivers d on d.id = t.driver_id
    where t.id = _trip_id and d.profile_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Signup → cria profile automaticamente
-- Lê name/role de raw_user_meta_data (passados no signUp do app).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'passenger')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Só admin altera is_approved do motorista (evita auto-aprovação)
-- -----------------------------------------------------------------------------
create or replace function public.guard_driver_approval()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.is_approved is distinct from old.is_approved) and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar a aprovação do motorista';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_driver_approval on public.drivers;
create trigger trg_guard_driver_approval
  before update on public.drivers
  for each row execute function public.guard_driver_approval();

-- -----------------------------------------------------------------------------
-- Disponibilidade por DATA → cria a viagem (trip) automaticamente
-- -----------------------------------------------------------------------------
create or replace function public.create_trip_from_availability()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.date is not null and new.is_active then
    insert into public.trips (
      route_id, driver_id, availability_id,
      trip_date, departure_time, total_seats, available_seats
    )
    values (
      new.route_id, new.driver_id, new.id,
      new.date, new.departure_time, new.available_seats, new.available_seats
    )
    on conflict (availability_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_create_trip_from_availability on public.driver_availability;
create trigger trg_create_trip_from_availability
  after insert on public.driver_availability
  for each row execute function public.create_trip_from_availability();

-- -----------------------------------------------------------------------------
-- Sincroniza status da trip conforme vagas (não mexe em cancelled/completed)
-- -----------------------------------------------------------------------------
create or replace function public.sync_trip_status()
returns trigger
language plpgsql as $$
begin
  if new.status not in ('cancelled', 'completed') then
    new.status := case when new.available_seats <= 0 then 'full' else 'open' end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_trip_status on public.trips;
create trigger trg_sync_trip_status
  before update of available_seats on public.trips
  for each row execute function public.sync_trip_status();

-- -----------------------------------------------------------------------------
-- Aprovação/cancelamento de solicitação → ajusta vagas da viagem
--   * approved  : -1 vaga (bloqueia se lotado), grava approved_at
--   * de approved p/ cancelled|rejected : +1 vaga
-- -----------------------------------------------------------------------------
create or replace function public.handle_request_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _seats int;
begin
  -- Aprovando uma solicitação
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select available_seats into _seats from public.trips where id = new.trip_id for update;
    if _seats <= 0 then
      raise exception 'Viagem sem vagas disponíveis';
    end if;
    update public.trips set available_seats = available_seats - 1 where id = new.trip_id;
    new.approved_at := now();

  -- Liberando uma vaga antes ocupada
  elsif old.status = 'approved' and new.status in ('cancelled', 'rejected') then
    update public.trips
      set available_seats = least(available_seats + 1, total_seats)
      where id = new.trip_id;
    new.approved_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_request_change on public.trip_requests;
create trigger trg_handle_request_change
  before update on public.trip_requests
  for each row execute function public.handle_request_change();

-- >>>>>>>>>>>>>>>>>>>> migrations/0003_rls_policies.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0003_rls_policies.sql — Row Level Security (permissões por perfil)
-- =============================================================================
-- Convenção: tudo bloqueado por padrão; cada policy abre um caminho específico.
-- `authenticated` = qualquer usuário logado. Inserts em profiles/trips via
-- trigger usam SECURITY DEFINER e ignoram RLS.
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.drivers             enable row level security;
alter table public.routes              enable row level security;
alter table public.driver_availability enable row level security;
alter table public.trips               enable row level security;
alter table public.trip_requests       enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
-- Leitura: logados veem perfis (necessário p/ exibir nomes de motorista/passageiro).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

-- Atualização: o próprio usuário (nome). Admin atualiza qualquer um.
-- A troca de `role` é restrita ao admin pelo WITH CHECK abaixo.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- drivers
-- -----------------------------------------------------------------------------
-- Leitura: logados (passageiros precisam ver dados do veículo na viagem).
drop policy if exists drivers_select on public.drivers;
create policy drivers_select on public.drivers
  for select to authenticated using (true);

-- Criação: o próprio usuário cria seu cadastro de motorista.
drop policy if exists drivers_insert_self on public.drivers;
create policy drivers_insert_self on public.drivers
  for insert to authenticated with check (profile_id = auth.uid());

-- Atualização: dono do cadastro ou admin (is_approved é travado por trigger).
drop policy if exists drivers_update on public.drivers;
create policy drivers_update on public.drivers
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- Exclusão: dono ou admin.
drop policy if exists drivers_delete on public.drivers;
create policy drivers_delete on public.drivers
  for delete to authenticated using (profile_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- routes — cadastro exclusivo do admin; leitura para todos os logados.
-- -----------------------------------------------------------------------------
drop policy if exists routes_select on public.routes;
create policy routes_select on public.routes
  for select to authenticated using (is_active or public.is_admin());

drop policy if exists routes_admin_write on public.routes;
create policy routes_admin_write on public.routes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- driver_availability
-- -----------------------------------------------------------------------------
drop policy if exists availability_select on public.driver_availability;
create policy availability_select on public.driver_availability
  for select to authenticated using (true);

drop policy if exists availability_write_owner on public.driver_availability;
create policy availability_write_owner on public.driver_availability
  for all to authenticated
  using (public.owns_driver(driver_id) or public.is_admin())
  with check (public.owns_driver(driver_id) or public.is_admin());

-- -----------------------------------------------------------------------------
-- trips — leitura para todos; escrita pelo motorista dono ou admin.
-- (Criação normalmente automática via trigger da disponibilidade.)
-- -----------------------------------------------------------------------------
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
  for select to authenticated using (true);

drop policy if exists trips_write_owner on public.trips;
create policy trips_write_owner on public.trips
  for all to authenticated
  using (public.owns_driver(driver_id) or public.is_admin())
  with check (public.owns_driver(driver_id) or public.is_admin());

-- -----------------------------------------------------------------------------
-- trip_requests
-- -----------------------------------------------------------------------------
-- Leitura: o passageiro dono, o motorista da viagem ou o admin.
drop policy if exists requests_select on public.trip_requests;
create policy requests_select on public.trip_requests
  for select to authenticated using (
    passenger_id = auth.uid()
    or public.owns_trip(trip_id)
    or public.is_admin()
  );

-- Criação: o próprio passageiro, sempre como 'pending'.
drop policy if exists requests_insert_self on public.trip_requests;
create policy requests_insert_self on public.trip_requests
  for insert to authenticated
  with check (passenger_id = auth.uid() and status = 'pending');

-- Atualização: passageiro (cancela a própria) OU motorista da viagem/admin (aprova/recusa).
drop policy if exists requests_update on public.trip_requests;
create policy requests_update on public.trip_requests
  for update to authenticated
  using (
    passenger_id = auth.uid()
    or public.owns_trip(trip_id)
    or public.is_admin()
  )
  with check (
    passenger_id = auth.uid()
    or public.owns_trip(trip_id)
    or public.is_admin()
  );

-- Exclusão: passageiro dono ou admin.
drop policy if exists requests_delete on public.trip_requests;
create policy requests_delete on public.trip_requests
  for delete to authenticated using (passenger_id = auth.uid() or public.is_admin());

-- >>>>>>>>>>>>>>>>>>>> migrations/0004_trip_cancellation.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0004_trip_cancellation.sql — Cancelar viagem propaga para as solicitações
-- =============================================================================
-- Quando uma viagem é cancelada, as solicitações pendentes/aprovadas dela
-- passam a 'cancelled' automaticamente, para o passageiro ver o status correto.
-- =============================================================================

create or replace function public.handle_trip_cancellation()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.trip_requests
      set status = 'cancelled'
      where trip_id = new.id and status in ('pending', 'approved');
  end if;
  return new;
end;
$$;

-- `after update of status`: não dispara quando o gatilho de vagas mexe só em
-- available_seats, evitando recursão com handle_request_change/sync_trip_status.
drop trigger if exists trg_handle_trip_cancellation on public.trips;
create trigger trg_handle_trip_cancellation
  after update of status on public.trips
  for each row execute function public.handle_trip_cancellation();
