# Banco de dados — rotas-flow (Supabase)

Schema do MVP: rotas compartilhadas entre **passageiros**, **motoristas** e **admin**.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `migrations/0001_schema.sql` | Tipos (enums), tabelas e índices |
| `migrations/0002_functions_triggers.sql` | Helpers de autorização + automações (signup, criação de trip, vagas) |
| `migrations/0003_rls_policies.sql` | Row Level Security (permissões por perfil) |
| `migrations/0004_trip_cancellation.sql` | Cancelar viagem cancela as solicitações dela |
| `seed.sql` | Usuários e dados de teste (somente dev) |

## Modelo

```
profiles (1:1 auth.users)
  └─ drivers (cadastro do veículo, is_approved)
routes (admin cria)
driver_availability (motorista, por data) ──trigger──▶ trips
trips (viagem de um dia, vagas) ◀── trip_requests (passageiro solicita)
```

## Automações (triggers)

- **Signup** → cria `profiles` lendo `name`/`role` do metadata.
- **Disponibilidade por data** → cria a `trip` automaticamente.
- **Aprovar solicitação** → `-1` vaga (bloqueia se lotado), grava `approved_at`; cancelar/recusar devolve a vaga.
- **Vagas = 0** → `trip.status` vira `full` automaticamente.
- **`is_approved` do motorista** → só admin altera.

## Permissões (resumo)

| Tabela | Leitura | Escrita |
|---|---|---|
| profiles | logados | próprio (nome); admin tudo. `role` só admin |
| drivers | logados | próprio cadastro; admin. Aprovação só admin |
| routes | logados (ativas) | **só admin** |
| driver_availability | logados | motorista dono ou admin |
| trips | logados | motorista dono ou admin (normalmente automático) |
| trip_requests | passageiro dono, motorista da viagem, admin | passageiro cria/cancela; motorista/admin aprova/recusa |

---

## Como aplicar

### Opção A — Supabase CLI (recomendado, local)

```bash
npm i -g supabase            # ou: npx supabase ...
supabase init                # se ainda não houver supabase/config.toml
supabase start               # sobe Postgres + Studio local
supabase db reset            # aplica migrations/ e roda seed.sql
```

### Opção B — Projeto na nuvem

No Dashboard → **SQL Editor**, rode na ordem:
`0001_schema.sql` → `0002_functions_triggers.sql` → `0003_rls_policies.sql` → `0004_trip_cancellation.sql`.
O `seed.sql` é opcional (cria usuários de teste).

Depois ligue a CLI ao projeto e use migrations:

```bash
supabase link --project-ref SEU_REF
supabase db push
```

## Conectar o app

1. `cp .env.example .env` e preencha URL + anon key.
2. Instale o storage de sessão (persistência de login no celular):
   ```bash
   npx expo install @react-native-async-storage/async-storage
   ```
3. Use o cliente em `src/lib/supabase.ts`.

## Usuários de teste (seed) — senha `password123`

| Email | Perfil |
|---|---|
| admin@rotasflow.dev | admin |
| motorista@rotasflow.dev | driver (aprovado) |
| passageiro@rotasflow.dev | passenger |
