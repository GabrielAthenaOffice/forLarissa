import type { UserRole } from "@/types/database";

/** Rota inicial (dentro de /(app)) de cada perfil. */
export const roleHome: Record<UserRole, "/motorista" | "/coordenador" | "/admin"> = {
  driver: "/motorista",
  coordinator: "/coordenador",
  admin: "/admin",
};

export const roleLabel: Record<UserRole, string> = {
  driver: "Motorista",
  coordinator: "Coordenador",
  admin: "Administrador",
};
