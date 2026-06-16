// =============================================================================
// create-account — Edge Function (Deno) para o ADMIN criar contas
// =============================================================================
// O app só tem a anon key, que não pode criar usuários de terceiros. Esta função:
//   1. valida que o chamador está logado E é admin (consultando profiles);
//   2. usa a service_role para criar o usuário com role no user_metadata;
//   3. o trigger handle_new_user cria o profile correspondente.
//
// Deploy:
//   supabase functions deploy create-account
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
// (SUPABASE_URL e SUPABASE_ANON_KEY já vêm injetadas pelo runtime.)
// =============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ROLES = ["driver", "coordinator"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Sem token de autenticação" }, 401);

  // Cliente "como o chamador" (respeita RLS) p/ identificar quem chama.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Não autenticado" }, 401);

  const { data: me } = await caller
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return json({ error: "Apenas administradores podem criar contas" }, 403);
  }

  // Payload
  let payload: { name?: string; email?: string; password?: string; role?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const name = payload.name?.trim();
  const email = payload.email?.trim();
  const role = payload.role as AllowedRole | undefined;
  // Senha provisória opcional — se não vier, gera uma aleatória.
  const password =
    payload.password && payload.password.length >= 6
      ? payload.password
      : crypto.randomUUID();

  if (!name || !email || !role || !ALLOWED_ROLES.includes(role)) {
    return json({ error: "Informe name, email e role (driver|coordinator)." }, 400);
  }

  // Cliente admin (service_role) — ignora RLS, cria o usuário.
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (createErr) return json({ error: createErr.message }, 400);

  return json({ id: created.user?.id, email, role, password });
});
