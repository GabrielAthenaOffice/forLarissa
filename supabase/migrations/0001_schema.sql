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
