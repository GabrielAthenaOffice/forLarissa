import { supabase } from "@/lib/supabase";
import type { DriverAvailability, Route } from "@/types/database";

export type AvailabilityWithRoute = DriverAvailability & {
  route: Pick<Route, "title" | "origin" | "destination"> | null;
};

export type AvailabilityInput = {
  route_id: string;
  date: string; // YYYY-MM-DD
  departure_time: string; // HH:MM
  available_seats: number;
};

/** Disponibilidades por data do motorista, da mais próxima para a mais distante. */
export async function listDriverAvailability(
  driverId: string
): Promise<AvailabilityWithRoute[]> {
  const { data, error } = await supabase
    .from("driver_availability")
    .select("*, route:routes(title, origin, destination)")
    .eq("driver_id", driverId)
    .order("date", { ascending: true })
    .returns<AvailabilityWithRoute[]>();
  if (error) throw error;
  return data ?? [];
}

/** Cria uma disponibilidade por data — o trigger gera a viagem automaticamente. */
export async function createAvailability(
  driverId: string,
  input: AvailabilityInput
): Promise<void> {
  const { error } = await supabase.from("driver_availability").insert({
    driver_id: driverId,
    route_id: input.route_id,
    date: input.date,
    departure_time: input.departure_time,
    available_seats: input.available_seats,
  });
  if (error) throw error;
}
