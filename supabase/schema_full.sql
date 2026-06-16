-- =============================================================
-- schema_full.sql — rotas-flow (estado final consolidado)
-- Cole TUDO no SQL Editor do Supabase e clique em Run.
-- Modelo: designação de rotas (Motorista / Coordenador / Admin).
-- Gerado a partir das migrations/ — não edite à mão.
-- =============================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('driver', 'coordinator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_status as enum ('assigned', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- profiles — 1:1 com auth.users (criado por trigger no signup)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null,
  role        public.user_role not null default 'driver',
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- drivers — dados do veículo / aprovação do motorista pelo admin
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
-- routes — rotas com horário e duração (cadastro do admin)
-- -----------------------------------------------------------------------------
create table if not exists public.routes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  origin          text not null,
  destination     text not null,
  description     text,
  departure_time  time not null default '08:00',
  duration_min    int  not null default 60 check (duration_min > 0),
  is_active       boolean not null default true,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- route_assignments — designação (rota + motorista + data)
-- -----------------------------------------------------------------------------
create table if not exists public.route_assignments (
  id          uuid primary key default gen_random_uuid(),
  route_id    uuid not null references public.routes (id) on delete cascade,
  driver_id   uuid not null references public.drivers (id) on delete cascade,
  date        date not null,
  status      public.assignment_status not null default 'assigned',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (route_id, driver_id, date)
);

-- -----------------------------------------------------------------------------
-- route_requests — coordenador solicita criação/edição; admin aprova
-- -----------------------------------------------------------------------------
create table if not exists public.route_requests (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('create', 'edit')),
  route_id        uuid references public.routes (id) on delete cascade,
  title           text not null,
  origin          text not null,
  destination     text not null,
  description     text,
  departure_time  time not null default '08:00',
  duration_min    int  not null default 60 check (duration_min > 0),
  status          public.request_status not null default 'pending',
  requested_by    uuid not null references public.profiles (id) on delete cascade,
  reviewed_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  constraint route_requests_edit_has_route check (kind = 'create' or route_id is not null)
);

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
create index if not exists idx_drivers_profile          on public.drivers (profile_id);
create index if not exists idx_routes_active            on public.routes (is_active);
create index if not exists idx_assignments_driver_date  on public.route_assignments (driver_id, date);
create index if not exists idx_assignments_date         on public.route_assignments (date);
create index if not exists idx_assignments_route        on public.route_assignments (route_id);
create index if not exists idx_route_requests_status    on public.route_requests (status);
create index if not exists idx_route_requests_requester on public.route_requests (requested_by);

-- =============================================================================
-- Funções auxiliares e automações
-- =============================================================================

-- É admin? (compara role::text p/ não amarrar dependência rígida ao enum)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role::text = 'admin'
  );
$$;

-- É coordenador?
create or replace function public.is_coordinator()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role::text = 'coordinator'
  );
$$;

-- O usuário logado é o motorista deste driver_id?
create or replace function public.owns_driver(_driver_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.drivers where id = _driver_id and profile_id = auth.uid()
  );
$$;

-- Signup → cria profile (default role = driver).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'driver')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Só admin altera is_approved do motorista.
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

-- Aprovação de solicitação de rota aplica a mudança em routes.
create or replace function public.handle_route_request_approval()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if new.kind = 'create' then
      insert into public.routes
        (title, origin, destination, description, departure_time, duration_min, created_by)
      values
        (new.title, new.origin, new.destination, new.description,
         new.departure_time, new.duration_min, new.requested_by);
    elsif new.kind = 'edit' and new.route_id is not null then
      update public.routes set
        title = new.title, origin = new.origin, destination = new.destination,
        description = new.description, departure_time = new.departure_time,
        duration_min = new.duration_min
      where id = new.route_id;
    end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_handle_route_request_approval on public.route_requests;
create trigger trg_handle_route_request_approval
  before update on public.route_requests
  for each row execute function public.handle_route_request_approval();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles          enable row level security;
alter table public.drivers           enable row level security;
alter table public.routes            enable row level security;
alter table public.route_assignments enable row level security;
alter table public.route_requests    enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- drivers
drop policy if exists drivers_select on public.drivers;
create policy drivers_select on public.drivers
  for select to authenticated using (true);

drop policy if exists drivers_insert_self on public.drivers;
create policy drivers_insert_self on public.drivers
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists drivers_update on public.drivers;
create policy drivers_update on public.drivers
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists drivers_delete on public.drivers;
create policy drivers_delete on public.drivers
  for delete to authenticated using (profile_id = auth.uid() or public.is_admin());

-- routes
drop policy if exists routes_select on public.routes;
create policy routes_select on public.routes
  for select to authenticated
  using (is_active or public.is_admin() or public.is_coordinator());

drop policy if exists routes_admin_write on public.routes;
create policy routes_admin_write on public.routes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- route_assignments
drop policy if exists assignments_select on public.route_assignments;
create policy assignments_select on public.route_assignments
  for select to authenticated
  using (public.owns_driver(driver_id) or public.is_admin() or public.is_coordinator());

drop policy if exists assignments_admin_write on public.route_assignments;
create policy assignments_admin_write on public.route_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- route_requests
drop policy if exists route_requests_select on public.route_requests;
create policy route_requests_select on public.route_requests
  for select to authenticated
  using (requested_by = auth.uid() or public.is_admin());

drop policy if exists route_requests_insert on public.route_requests;
create policy route_requests_insert on public.route_requests
  for insert to authenticated
  with check (
    requested_by = auth.uid() and status = 'pending'
    and (public.is_coordinator() or public.is_admin())
  );

drop policy if exists route_requests_update on public.route_requests;
create policy route_requests_update on public.route_requests
  for update to authenticated
  using (public.is_admin() or requested_by = auth.uid())
  with check (
    public.is_admin()
    or (requested_by = auth.uid() and status in ('pending', 'cancelled'))
  );

drop policy if exists route_requests_delete on public.route_requests;
create policy route_requests_delete on public.route_requests
  for delete to authenticated using (requested_by = auth.uid() or public.is_admin());
