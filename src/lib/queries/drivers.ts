import { supabase } from "@/lib/supabase";
import type { Driver, Profile, UserRole } from "@/types/database";

export type NewAccount = {
  name: string;
  email: string;
  password?: string;
  role: Extract<UserRole, "driver" | "coordinator">;
};

/**
 * Admin cria uma conta (motorista/coordenador) via Edge Function `create-account`.
 * Retorna a senha (a gerada, se nenhuma foi informada) para repassar ao usuário.
 */
export async function createAccount(
  input: NewAccount
): Promise<{ password: string }> {
  const { data, error } = await supabase.functions.invoke("create-account", {
    body: input,
  });
  if (error) {
    // A Edge Function devolve { error } no corpo em caso de 4xx.
    const message =
      (data as { error?: string } | null)?.error ?? error.message ?? "Erro ao criar conta";
    throw new Error(message);
  }
  return { password: (data as { password: string }).password };
}

export type DriverWithProfile = Driver & {
  profile: Pick<Profile, "name" | "email"> | null;
};

export type DriverInput = {
  phone: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  seat_count: number;
};

/** Cadastro de motorista do usuário logado (null se ainda não criou). */
export async function getMyDriver(profileId: string): Promise<Driver | null> {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Todos os motoristas com nome/email (admin). Mais recentes primeiro. */
export async function listAllDrivers(): Promise<DriverWithProfile[]> {
  const { data, error } = await supabase
    .from("drivers")
    .select("*, profile:profiles(name, email)")
    .order("created_at", { ascending: false })
    .returns<DriverWithProfile[]>();
  if (error) throw error;
  return data ?? [];
}

/** Admin aprova/reprova um motorista (trigger garante que só admin altera). */
export async function setDriverApproval(
  id: string,
  approved: boolean
): Promise<void> {
  const { error } = await supabase
    .from("drivers")
    .update({ is_approved: approved })
    .eq("id", id);
  if (error) throw error;
}

/** Cria (se não existir) ou atualiza o cadastro do veículo. is_approved fica a cargo do admin. */
export async function saveDriver(
  profileId: string,
  input: DriverInput,
  existingId?: string
): Promise<Driver> {
  if (existingId) {
    const { data, error } = await supabase
      .from("drivers")
      .update(input)
      .eq("id", existingId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("drivers")
    .insert({ ...input, profile_id: profileId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
