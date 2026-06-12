import { supabase } from "@/lib/supabase";

const today = () => new Date().toISOString().slice(0, 10);

type CountResult = { count: number | null; error: { message: string } | null };

function check(...results: CountResult[]): void {
  for (const r of results) if (r.error) throw r.error;
}

/** KPIs do coordenador. */
export async function adminStats() {
  const t = today();
  const [activeRoutes, pendingDrivers, tripsToday, pendingRequests] = await Promise.all([
    supabase.from("routes").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("drivers").select("*", { count: "exact", head: true }).eq("is_approved", false),
    supabase.from("trips").select("*", { count: "exact", head: true }).eq("trip_date", t),
    supabase.from("trip_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  check(activeRoutes, pendingDrivers, tripsToday, pendingRequests);
  return {
    activeRoutes: activeRoutes.count ?? 0,
    pendingDrivers: pendingDrivers.count ?? 0,
    tripsToday: tripsToday.count ?? 0,
    pendingRequests: pendingRequests.count ?? 0,
  };
}

/** KPIs do motorista. pendingRequests já é restrito às viagens dele pelo RLS. */
export async function driverStats(driverId: string) {
  const t = today();
  const [tripsToday, upcomingTrips, pendingRequests] = await Promise.all([
    supabase.from("trips").select("*", { count: "exact", head: true }).eq("driver_id", driverId).eq("trip_date", t),
    supabase.from("trips").select("*", { count: "exact", head: true }).eq("driver_id", driverId).gte("trip_date", t),
    supabase.from("trip_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  check(tripsToday, upcomingTrips, pendingRequests);
  return {
    tripsToday: tripsToday.count ?? 0,
    upcomingTrips: upcomingTrips.count ?? 0,
    pendingRequests: pendingRequests.count ?? 0,
  };
}

/** KPIs do passageiro. */
export async function passengerStats(passengerId: string) {
  const [pending, confirmed] = await Promise.all([
    supabase.from("trip_requests").select("*", { count: "exact", head: true }).eq("passenger_id", passengerId).eq("status", "pending"),
    supabase.from("trip_requests").select("*", { count: "exact", head: true }).eq("passenger_id", passengerId).eq("status", "approved"),
  ]);
  check(pending, confirmed);
  return {
    pending: pending.count ?? 0,
    confirmed: confirmed.count ?? 0,
  };
}
