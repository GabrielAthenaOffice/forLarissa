import type { UserRole } from "@/types/database";

/** Rota inicial (dentro de /(app)) de cada perfil. */
export const roleHome: Record<UserRole, "/passageiro" | "/motorista" | "/admin"> = {
  passenger: "/passageiro",
  driver: "/motorista",
  admin: "/admin",
};

export const roleLabel: Record<UserRole, string> = {
  passenger: "Passageiro",
  driver: "Motorista",
  admin: "Coordenador",
};
