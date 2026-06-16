import { supabase } from "@/lib/supabase";

const today = () => new Date().toISOString().slice(0, 10);

type CountResult = { count: number | null; error: { message: string } | null };

function check(...results: CountResult[]): void {
  for (const r of results) if (r.error) throw r.error;
}

/** KPIs do admin. */
export async function adminStats() {
  const t = today();
  const [activeRoutes, pendingDrivers, assignmentsToday, pendingRequests] =
    await Promise.all([
      supabase.from("routes").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("drivers").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("route_assignments").select("*", { count: "exact", head: true }).eq("date", t),
      supabase.from("route_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);
  check(activeRoutes, pendingDrivers, assignmentsToday, pendingRequests);
  return {
    activeRoutes: activeRoutes.count ?? 0,
    pendingDrivers: pendingDrivers.count ?? 0,
    assignmentsToday: assignmentsToday.count ?? 0,
    pendingRequests: pendingRequests.count ?? 0,
  };
}

/** KPIs do motorista — designações de hoje e futuras. */
export async function driverStats(driverId: string) {
  const t = today();
  const [assignmentsToday, upcoming] = await Promise.all([
    supabase.from("route_assignments").select("*", { count: "exact", head: true }).eq("driver_id", driverId).eq("date", t),
    supabase.from("route_assignments").select("*", { count: "exact", head: true }).eq("driver_id", driverId).gte("date", t),
  ]);
  check(assignmentsToday, upcoming);
  return {
    assignmentsToday: assignmentsToday.count ?? 0,
    upcoming: upcoming.count ?? 0,
  };
}

/** KPIs do coordenador. */
export async function coordinatorStats(coordinatorId: string) {
  const [activeRoutes, drivers, myPending] = await Promise.all([
    supabase.from("routes").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("drivers").select("*", { count: "exact", head: true }),
    supabase.from("route_requests").select("*", { count: "exact", head: true }).eq("requested_by", coordinatorId).eq("status", "pending"),
  ]);
  check(activeRoutes, drivers, myPending);
  return {
    activeRoutes: activeRoutes.count ?? 0,
    drivers: drivers.count ?? 0,
    myPending: myPending.count ?? 0,
  };
}
