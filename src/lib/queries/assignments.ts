import { supabase } from "@/lib/supabase";
import type { AssignmentStatus, Profile, Route, RouteAssignment } from "@/types/database";

export type AssignmentWithRoute = RouteAssignment & {
  route: Pick<
    Route,
    "title" | "origin" | "destination" | "departure_time" | "duration_min"
  > | null;
};

export type AssignmentWithDetails = AssignmentWithRoute & {
  driver: { profile: Pick<Profile, "name"> | null } | null;
};

const ROUTE_FIELDS = "title, origin, destination, departure_time, duration_min";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Designações do motorista, de hoje em diante (rotas que ele vai receber). */
export async function listDriverAssignments(
  driverId: string
): Promise<AssignmentWithRoute[]> {
  const { data, error } = await supabase
    .from("route_assignments")
    .select(`*, route:routes(${ROUTE_FIELDS})`)
    .eq("driver_id", driverId)
    .gte("date", today())
    .order("date", { ascending: true })
    .returns<AssignmentWithRoute[]>();
  if (error) throw error;
  return data ?? [];
}

/** Todas as designações de hoje em diante (calendário/relatório do admin/coordenador). */
export async function listUpcomingAssignments(): Promise<AssignmentWithDetails[]> {
  const { data, error } = await supabase
    .from("route_assignments")
    .select(`*, route:routes(${ROUTE_FIELDS}), driver:drivers(profile:profiles(name))`)
    .gte("date", today())
    .order("date", { ascending: true })
    .returns<AssignmentWithDetails[]>();
  if (error) throw error;
  return data ?? [];
}

/** Designações de uma data específica (calendário do admin). */
export async function listAssignmentsByDate(
  date: string
): Promise<AssignmentWithDetails[]> {
  const { data, error } = await supabase
    .from("route_assignments")
    .select(`*, route:routes(${ROUTE_FIELDS}), driver:drivers(profile:profiles(name))`)
    .eq("date", date)
    .order("date", { ascending: true })
    .returns<AssignmentWithDetails[]>();
  if (error) throw error;
  return data ?? [];
}

/** Admin cria uma designação (rota + motorista + data). */
export async function createAssignment(
  input: { route_id: string; driver_id: string; date: string },
  createdBy: string
): Promise<void> {
  const { error } = await supabase
    .from("route_assignments")
    .insert({ ...input, created_by: createdBy });
  // 23505 = já existe designação dessa rota p/ esse motorista nessa data.
  if (error) {
    if (error.code === "23505")
      throw new Error("Esse motorista já está designado para essa rota nesta data.");
    throw error;
  }
}

/** Atualiza o status de uma designação (cancelar/concluir). */
export async function setAssignmentStatus(
  id: string,
  status: AssignmentStatus
): Promise<void> {
  const { error } = await supabase
    .from("route_assignments")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
