import { supabase } from "@/lib/supabase";
import type { Profile, Route, Trip } from "@/types/database";

export type TripWithRoute = Trip & {
  route: Pick<Route, "title" | "origin" | "destination"> | null;
};

export type AvailableTrip = TripWithRoute & {
  driver:
    | {
        vehicle_model: string | null;
        vehicle_color: string | null;
        profile: Pick<Profile, "name"> | null;
      }
    | null;
};

export type ReportTrip = TripWithRoute & {
  driver: { profile: Pick<Profile, "name"> | null } | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Viagens abertas com vaga, de hoje em diante (para o passageiro). */
export async function listAvailableTrips(): Promise<AvailableTrip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select(
      "*, route:routes(title, origin, destination), driver:drivers(vehicle_model, vehicle_color, profile:profiles(name))"
    )
    .eq("status", "open")
    .gt("available_seats", 0)
    .gte("trip_date", today())
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .returns<AvailableTrip[]>();
  if (error) throw error;
  return data ?? [];
}

/** Todas as viagens de hoje em diante (calendário do admin). */
export async function listUpcomingTrips(): Promise<ReportTrip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select(
      "*, route:routes(title, origin, destination), driver:drivers(profile:profiles(name))"
    )
    .gte("trip_date", today())
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .returns<ReportTrip[]>();
  if (error) throw error;
  return data ?? [];
}

/** Todas as viagens de uma data (relatório do admin). */
export async function listTripsByDate(date: string): Promise<ReportTrip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select(
      "*, route:routes(title, origin, destination), driver:drivers(profile:profiles(name))"
    )
    .eq("trip_date", date)
    .order("departure_time", { ascending: true })
    .returns<ReportTrip[]>();
  if (error) throw error;
  return data ?? [];
}

/** Motorista confirma que a viagem foi realizada. */
export async function completeTrip(tripId: string): Promise<void> {
  const { data, error } = await supabase
    .from("trips")
    .update({ status: "completed" })
    .eq("id", tripId)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error("A viagem não pôde ser concluída. Verifique se você é o motorista desta viagem.");
}

/** Cancela a viagem — o trigger cancela as solicitações pendentes/aprovadas. */
export async function cancelTrip(tripId: string): Promise<void> {
  const { data, error } = await supabase
    .from("trips")
    .update({ status: "cancelled" })
    .eq("id", tripId)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error("A viagem não pôde ser cancelada. Verifique se você é o motorista desta viagem.");
}

/** Viagens do motorista de hoje em diante (agenda). */
export async function listDriverTrips(driverId: string): Promise<TripWithRoute[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*, route:routes(title, origin, destination)")
    .eq("driver_id", driverId)
    .gte("trip_date", today())
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .returns<TripWithRoute[]>();
  if (error) throw error;
  return data ?? [];
}
