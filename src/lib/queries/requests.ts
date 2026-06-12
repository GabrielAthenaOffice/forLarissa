import { supabase } from "@/lib/supabase";
import type { Profile, RequestStatus, Route, Trip, TripRequest } from "@/types/database";

export type RequestWithDetails = TripRequest & {
  passenger: Pick<Profile, "name"> | null;
  trip:
    | (Pick<Trip, "trip_date" | "departure_time" | "available_seats"> & {
        route: Pick<Route, "title"> | null;
      })
    | null;
};

/**
 * Solicitações que o usuário logado pode gerenciar — RLS restringe ao escopo:
 * motorista vê as das suas viagens, admin vê todas. Mais recentes primeiro.
 */
export async function listManagedRequests(): Promise<RequestWithDetails[]> {
  const { data, error } = await supabase
    .from("trip_requests")
    .select(
      "*, passenger:profiles(name), trip:trips(trip_date, departure_time, available_seats, route:routes(title))"
    )
    .order("created_at", { ascending: false })
    .returns<RequestWithDetails[]>();
  if (error) throw error;
  return data ?? [];
}

/** Aprova ou recusa uma solicitação — o trigger ajusta as vagas da viagem. */
export async function setRequestStatus(
  id: string,
  status: Extract<RequestStatus, "approved" | "rejected">
): Promise<void> {
  const { error } = await supabase
    .from("trip_requests")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

// ----- Passageiro -----

export type PassengerRequest = TripRequest & {
  trip:
    | (Pick<Trip, "trip_date" | "departure_time" | "status"> & {
        route: Pick<Route, "title" | "origin" | "destination"> | null;
      })
    | null;
};

/** Cria uma solicitação de vaga (status inicial = pending). */
export async function createRequest(
  tripId: string,
  passengerId: string
): Promise<void> {
  const { error } = await supabase
    .from("trip_requests")
    .insert({ trip_id: tripId, passenger_id: passengerId });
  // 23505 = já existe solicitação para esta viagem.
  if (error) {
    if (error.code === "23505") throw new Error("Você já solicitou esta viagem.");
    throw error;
  }
}

/** Solicitações do passageiro logado, mais recentes primeiro. */
export async function listPassengerRequests(
  passengerId: string
): Promise<PassengerRequest[]> {
  const { data, error } = await supabase
    .from("trip_requests")
    .select(
      "*, trip:trips(trip_date, departure_time, status, route:routes(title, origin, destination))"
    )
    .eq("passenger_id", passengerId)
    .order("created_at", { ascending: false })
    .returns<PassengerRequest[]>();
  if (error) throw error;
  return data ?? [];
}

/** Solicitação faz parte do histórico: viagem concluída ou com data já passada. */
export function isPastRequest(r: PassengerRequest): boolean {
  if (!r.trip) return false;
  const today = new Date().toISOString().slice(0, 10);
  return r.trip.status === "completed" || r.trip.trip_date < today;
}

/** Passageiro cancela a própria solicitação (o trigger devolve a vaga se aprovada). */
export async function cancelRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("trip_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}
