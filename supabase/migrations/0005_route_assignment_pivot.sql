-- =============================================================================
-- 0005_route_assignment_pivot.sql — Pivot: carona → designação de rotas
-- =============================================================================
-- Remove o modelo de carona (passageiro pede vaga em viagens) e adota o modelo
-- corporativo de escala:
--   * Admin cria rotas (horário + duração) e DESIGNA motoristas por data.
--   * Coordenador SOLICITA criação/edição de rotas; admin aprova.
--   * Motorista apenas vê as rotas designadas a ele.
-- Papéis passam a ser: driver, coordinator, admin (passenger deixa de existir).
-- ATENÇÃO: destrutivo — dropa trips, trip_requests e driver_availability.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Remover automações e tabelas do modelo de carona
-- -----------------------------------------------------------------------------
drop trigger if exists trg_create_trip_from_availability on public.driver_availability;
drop trigger if exists trg_sync_trip_status on public.trips;
drop trigger if exists trg_handle_request_change on public.trip_requests;
drop trigger if exists trg_handle_trip_cancellation on public.trips;

drop function if exists public.create_trip_from_availability() cascade;
drop function if exists public.sync_trip_status() cascade;
drop function if exists public.handle_request_change() cascade;
drop function if exists public.handle_trip_cancellation() cascade;
drop function if exists public.owns_trip(uuid) cascade;

drop table if exists public.trip_requests cascade;
drop table if exists public.trips cascade;
drop table if exists public.driver_availability cascade;

-- -----------------------------------------------------------------------------
-- 2) Enum user_role: troca 'passenger' por 'coordinator'
--   Postgres não remove valor de enum → recria o tipo. Para o DROP TYPE não
--   esbarrar em dependências, antes:
--     * is_admin() passa a comparar role::text (sem amarrar ao tipo);
--     * a policy profiles_update_self (que referencia role) é recriada depois.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text = 'admin'
  );
$$;

drop policy if exists profiles_update_self on public.profiles;

do $$ begin
  create type public.user_role_new as enum ('driver', 'coordinator', 'admin');
exception when duplicate_object then null; end $$;

alter table public.profiles alter column role drop default;
alter table public.profiles
  alter column role type public.user_role_new
  using (case when role::text = 'passenger' then 'driver'
              else role::text end::public.user_role_new);
alter table public.profiles alter column role set default 'driver';

drop type public.user_role;
alter type public.user_role_new rename to user_role;

drop type if exists public.trip_status;

-- Recria a policy de update do próprio perfil (não pode trocar o próprio role).
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 3) routes: horário de partida e duração
-- -----------------------------------------------------------------------------
alter table public.routes
  add column if not exists departure_time time not null default '08:00';
alter table public.routes
  add column if not exists duration_min int not null default 60 check (duration_min > 0);

-- -----------------------------------------------------------------------------
-- 4) route_assignments — designação (rota + motorista + data)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.assignment_status as enum ('assigned', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

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

create index if not exists idx_assignments_driver_date on public.route_assignments (driver_id, date);
create index if not exists idx_assignments_date        on public.route_assignments (date);
create index if not exists idx_assignments_route       on public.route_assignments (route_id);

-- -----------------------------------------------------------------------------
-- 5) route_requests — coordenador solicita criação/edição; admin aprova
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
  duration_min    int not null default 60 check (duration_min > 0),
  status          public.request_status not null default 'pending',
  requested_by    uuid not null references public.profiles (id) on delete cascade,
  reviewed_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  constraint route_requests_edit_has_route check (kind = 'create' or route_id is not null)
);

create index if not exists idx_route_requests_status    on public.route_requests (status);
create index if not exists idx_route_requests_requester on public.route_requests (requested_by);

-- -----------------------------------------------------------------------------
-- 6) Helpers + automações
-- -----------------------------------------------------------------------------

-- É coordenador?
create or replace function public.is_coordinator()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text = 'coordinator'
  );
$$;

-- Signup → profile. Default de role agora é 'driver' (autocadastro = motorista).
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

-- Aprovação de uma solicitação de rota aplica a mudança em routes.
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
        title          = new.title,
        origin         = new.origin,
        destination    = new.destination,
        description    = new.description,
        departure_time = new.departure_time,
        duration_min   = new.duration_min
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

-- -----------------------------------------------------------------------------
-- 7) RLS
-- -----------------------------------------------------------------------------
alter table public.route_assignments enable row level security;
alter table public.route_requests    enable row level security;

-- routes: logados veem as ativas; admin e coordenador veem todas.
drop policy if exists routes_select on public.routes;
create policy routes_select on public.routes
  for select to authenticated
  using (is_active or public.is_admin() or public.is_coordinator());
-- (routes_admin_write — escrita só admin — permanece do 0003.)

-- route_assignments: motorista vê as suas; admin/coordenador veem todas. Escrita só admin.
drop policy if exists assignments_select on public.route_assignments;
create policy assignments_select on public.route_assignments
  for select to authenticated
  using (public.owns_driver(driver_id) or public.is_admin() or public.is_coordinator());

drop policy if exists assignments_admin_write on public.route_assignments;
create policy assignments_admin_write on public.route_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- route_requests: requester (coordenador) e admin leem.
drop policy if exists route_requests_select on public.route_requests;
create policy route_requests_select on public.route_requests
  for select to authenticated
  using (requested_by = auth.uid() or public.is_admin());

-- Criação: coordenador (ou admin), sempre como 'pending' e em nome próprio.
drop policy if exists route_requests_insert on public.route_requests;
create policy route_requests_insert on public.route_requests
  for insert to authenticated
  with check (
    requested_by = auth.uid()
    and status = 'pending'
    and (public.is_coordinator() or public.is_admin())
  );

-- Atualização: admin aprova/recusa; o requester só pode mover p/ pending/cancelled
-- (impede o coordenador de auto-aprovar a própria solicitação).
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
