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
