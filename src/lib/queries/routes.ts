import { supabase } from "@/lib/supabase";
import type { Route } from "@/types/database";

export type RouteInput = {
  title: string;
  origin: string;
  destination: string;
  description: string | null;
  departure_time: string; // HH:MM
  duration_min: number;
  is_active: boolean;
};

/** Rotas em ordem de criação (mais recentes primeiro). */
export async function listRoutes(): Promise<Route[]> {
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRoute(id: string): Promise<Route> {
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createRoute(
  input: RouteInput,
  createdBy: string
): Promise<Route> {
  const { data, error } = await supabase
    .from("routes")
    .insert({ ...input, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoute(
  id: string,
  input: RouteInput
): Promise<Route> {
  const { data, error } = await supabase
    .from("routes")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
