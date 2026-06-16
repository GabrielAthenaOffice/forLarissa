import { supabase } from "@/lib/supabase";
import type { Profile, RequestStatus, RouteRequest, RouteRequestKind } from "@/types/database";

export type RouteRequestWithRequester = RouteRequest & {
  requester: Pick<Profile, "name"> | null;
};

export type RouteRequestInput = {
  kind: RouteRequestKind;
  route_id: string | null;
  title: string;
  origin: string;
  destination: string;
  description: string | null;
  departure_time: string; // HH:MM
  duration_min: number;
};

/** Coordenador cria uma solicitação de criação/edição de rota (status = pending). */
export async function createRouteRequest(
  input: RouteRequestInput,
  requestedBy: string
): Promise<void> {
  const { error } = await supabase
    .from("route_requests")
    .insert({ ...input, requested_by: requestedBy });
  if (error) throw error;
}

/** Solicitações que o admin gerencia (RLS já restringe ao escopo). Recentes primeiro. */
export async function listManagedRouteRequests(): Promise<RouteRequestWithRequester[]> {
  const { data, error } = await supabase
    .from("route_requests")
    .select("*, requester:profiles!route_requests_requested_by_fkey(name)")
    .order("created_at", { ascending: false })
    .returns<RouteRequestWithRequester[]>();
  if (error) throw error;
  return data ?? [];
}

/** Solicitações do coordenador logado, mais recentes primeiro. */
export async function listMyRouteRequests(
  requestedBy: string
): Promise<RouteRequest[]> {
  const { data, error } = await supabase
    .from("route_requests")
    .select("*")
    .eq("requested_by", requestedBy)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Admin aprova ou recusa — o trigger aplica a mudança em routes quando aprovado. */
export async function setRouteRequestStatus(
  id: string,
  status: Extract<RequestStatus, "approved" | "rejected">
): Promise<void> {
  const { error } = await supabase
    .from("route_requests")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

/** Coordenador cancela a própria solicitação pendente. */
export async function cancelRouteRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("route_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}
