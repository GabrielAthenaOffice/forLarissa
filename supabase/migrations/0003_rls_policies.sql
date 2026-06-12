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
