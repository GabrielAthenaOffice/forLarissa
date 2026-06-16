// Tipos do banco rotas-flow.
// Dica: depois você pode gerar isto automaticamente com:
//   npx supabase gen types typescript --local > src/types/database.ts

export type UserRole = "driver" | "coordinator" | "admin";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type AssignmentStatus = "assigned" | "completed" | "cancelled";
export type RouteRequestKind = "create" | "edit";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Driver {
  id: string;
  profile_id: string;
  phone: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  seat_count: number;
  is_approved: boolean;
  created_at: string;
}

export interface Route {
  id: string;
  title: string;
  origin: string;
  destination: string;
  description: string | null;
  departure_time: string; // HH:MM[:SS]
  duration_min: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface RouteAssignment {
  id: string;
  route_id: string;
  driver_id: string;
  date: string; // YYYY-MM-DD
  status: AssignmentStatus;
  created_by: string | null;
  created_at: string;
}

export interface RouteRequest {
  id: string;
  kind: RouteRequestKind;
  route_id: string | null;
  title: string;
  origin: string;
  destination: string;
  description: string | null;
  departure_time: string;
  duration_min: number;
  status: RequestStatus;
  requested_by: string;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

// Estrutura no formato esperado por createClient<Database>().
// Mapped types (em vez de repassar a interface) garantem a index signature
// implícita exigida por `Record<string, unknown>` no GenericTable do supabase.
// `Insert`/`Update` deixam opcionais as colunas com default no banco.
type Row<T> = { [K in keyof T]: T[K] };
type Insert<T, Optional extends keyof T> = { [K in keyof Omit<T, Optional>]: T[K] } & {
  [K in Optional]?: T[K];
};
type Update<T> = { [K in keyof T]?: T[K] };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Row<Profile>;
        Insert: Insert<Profile, "role" | "created_at">;
        Update: Update<Profile>;
        Relationships: [];
      };
      drivers: {
        Row: Row<Driver>;
        Insert: Insert<Driver, "id" | "seat_count" | "is_approved" | "created_at">;
        Update: Update<Driver>;
        Relationships: [];
      };
      routes: {
        Row: Row<Route>;
        Insert: Insert<
          Route,
          "id" | "departure_time" | "duration_min" | "is_active" | "created_at"
        >;
        Update: Update<Route>;
        Relationships: [];
      };
      route_assignments: {
        Row: Row<RouteAssignment>;
        Insert: Insert<RouteAssignment, "id" | "status" | "created_at">;
        Update: Update<RouteAssignment>;
        Relationships: [];
      };
      route_requests: {
        Row: Row<RouteRequest>;
        Insert: Insert<
          RouteRequest,
          | "id"
          | "route_id"
          | "description"
          | "departure_time"
          | "duration_min"
          | "status"
          | "reviewed_by"
          | "created_at"
          | "reviewed_at"
        >;
        Update: Update<RouteRequest>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      request_status: RequestStatus;
      assignment_status: AssignmentStatus;
    };
  };
}
