-- =============================================================================
-- seed.sql — Dados iniciais para DESENVOLVIMENTO LOCAL
-- =============================================================================
-- Rodado automaticamente por `supabase db reset`.
-- NÃO use em produção: cria usuários de teste com senha fixa.
--
-- Usuários (senha de todos: password123):
--   admin@rotasflow.dev        → admin
--   motorista@rotasflow.dev    → driver (aprovado)
--   coordenador@rotasflow.dev  → coordinator
-- =============================================================================

-- IDs fixos para reprodutibilidade
do $$
declare
  admin_id       uuid := '00000000-0000-0000-0000-000000000a01';
  driver_id      uuid := '00000000-0000-0000-0000-000000000d01';
  coordinator_id uuid := '00000000-0000-0000-0000-000000000c01';
  v_driver_id    uuid;
  v_route_id     uuid;
begin
  -- ---- auth.users (dispara trigger handle_new_user → cria profiles) ----------
  insert into auth.users
    (id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
     created_at, updated_at)
  values
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@rotasflow.dev', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"name":"Admin Geral","role":"admin"}', now(), now()),
    (driver_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'motorista@rotasflow.dev', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"name":"Carlos Motorista","role":"driver"}', now(), now()),
    (coordinator_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'coordenador@rotasflow.dev', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"name":"Ana Coordenadora","role":"coordinator"}', now(), now())
  on conflict (id) do nothing;

  -- identities (necessário p/ login por email no GoTrue)
  insert into auth.identities
    (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), admin_id, admin_id::text,
     format('{"sub":"%s","email":"admin@rotasflow.dev"}', admin_id)::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), driver_id, driver_id::text,
     format('{"sub":"%s","email":"motorista@rotasflow.dev"}', driver_id)::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), coordinator_id, coordinator_id::text,
     format('{"sub":"%s","email":"coordenador@rotasflow.dev"}', coordinator_id)::jsonb,
     'email', now(), now(), now())
  on conflict do nothing;

  -- ---- driver: cadastro do veículo (aprovado) -------------------------------
  insert into public.drivers
    (profile_id, phone, vehicle_model, vehicle_plate, vehicle_color, seat_count, is_approved)
  values
    (driver_id, '11999990000', 'Toyota Corolla', 'ABC1D23', 'Prata', 4, true)
  on conflict (profile_id) do nothing
  returning id into v_driver_id;

  if v_driver_id is null then
    select id into v_driver_id from public.drivers where profile_id = driver_id;
  end if;

  -- ---- routes: rotas criadas pelo admin (com horário e duração) -------------
  insert into public.routes (title, origin, destination, description, departure_time, duration_min, created_by)
  values
    ('Centro → Zona Sul', 'Centro', 'Zona Sul', 'Rota comercial da manhã', '07:30', 45, admin_id),
    ('Bairro → Universidade', 'Bairro Industrial', 'Campus Universitário', 'Saída para aulas', '06:45', 60, admin_id)
  on conflict do nothing;

  select id into v_route_id from public.routes where title = 'Centro → Zona Sul' limit 1;

  -- ---- designação: admin atribui a rota ao motorista para amanhã ------------
  insert into public.route_assignments (route_id, driver_id, date, created_by)
  values (v_route_id, v_driver_id, current_date + 1, admin_id)
  on conflict (route_id, driver_id, date) do nothing;

  -- ---- solicitação do coordenador (pendente de aprovação do admin) ----------
  insert into public.route_requests
    (kind, title, origin, destination, description, departure_time, duration_min, requested_by)
  values
    ('create', 'Terminal → Hospital', 'Terminal Rodoviário', 'Hospital Central',
     'Demanda da equipe de enfermagem', '05:30', 30, coordinator_id);
end $$;
