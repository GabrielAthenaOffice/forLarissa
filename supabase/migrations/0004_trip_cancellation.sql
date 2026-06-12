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
