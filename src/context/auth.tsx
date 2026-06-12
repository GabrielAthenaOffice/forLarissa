import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types/database";

type SignUpParams = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type AuthResult = { error: string | null };
/** needsConfirmation: cadastro ok, mas falta confirmar email (sem sessão ativa). */
type SignUpResult = AuthResult & { needsConfirmation: boolean };

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** true enquanto a sessão inicial e o perfil ainda não foram resolvidos */
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  updateProfileName: (name: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error("useSession precisa estar dentro de <SessionProvider />");
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function applySession(next: Session | null) {
      if (!active) return;
      setSession(next);

      if (next?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", next.user.id)
          .maybeSingle();
        if (active) setProfile(data ?? null);
      } else if (active) {
        setProfile(null);
      }

      if (active) setIsLoading(false);
    }

    // Resolve a sessão persistida...
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    // ...e reage a login/logout/refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      applySession(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return { error: error?.message ?? null };
      },
      async signUp({ name, email, password, role }) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim(), role } },
        });
        return {
          error: error?.message ?? null,
          needsConfirmation: !error && !data.session,
        };
      },
      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error?.message ?? null };
      },
      async updateProfileName(name) {
        if (!session?.user?.id) return { error: "Sem sessão ativa" };
        
        // Atualiza a tabela profiles
        const { error } = await supabase
          .from("profiles")
          .update({ name: name.trim() })
          .eq("id", session.user.id);
          
        if (error) return { error: error.message };

        // Atualiza o user metadata (para manter sincronizado com auth)
        await supabase.auth.updateUser({ data: { name: name.trim() } });
        
        // Atualiza o estado local
        if (profile) {
          setProfile({ ...profile, name: name.trim() });
        }
        
        return { error: null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, isLoading]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}


