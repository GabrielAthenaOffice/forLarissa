// Tipos do banco rotas-flow.
// Dica: depois você pode gerar isto automaticamente com:
//   npx supabase gen types typescript --local > src/types/database.ts

export type UserRole = "passenger" | "driver" | "admin";
export type TripStatus = "open" | "full" | "cancelled" | "completed";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

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
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface DriverAvailability {
  id: string;
  driver_id: string;
  route_id: string;
  weekday: number | null;
  date: string | null;
  departure_time: string;
  available_seats: number;
  is_active: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  route_id: string;
  driver_id: string;
  availability_id: string | null;
  trip_date: string;
  departure_time: string;
  total_seats: number;
  available_seats: number;
  status: TripStatus;
  created_at: string;
}

export interface TripRequest {
  id: string;
  trip_id: string;
  passenger_id: string;
  status: RequestStatus;
  created_at: string;
  approved_at: string | null;
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
        Insert: Insert<Route, "id" | "is_active" | "created_at">;
        Update: Update<Route>;
        Relationships: [];
      };
      driver_availability: {
        Row: Row<DriverAvailability>;
        Insert: Insert<
          DriverAvailability,
          "id" | "weekday" | "date" | "is_active" | "created_at"
        >;
        Update: Update<DriverAvailability>;
        Relationships: [];
      };
      trips: {
        Row: Row<Trip>;
        Insert: Insert<Trip, "id" | "status" | "created_at">;
        Update: Update<Trip>;
        Relationships: [];
      };
      trip_requests: {
        Row: Row<TripRequest>;
        Insert: Insert<TripRequest, "id" | "status" | "created_at" | "approved_at">;
        Update: Update<TripRequest>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      trip_status: TripStatus;
      request_status: RequestStatus;
    };
  };
}
