# Banco de dados — rotas-flow (Supabase)

Schema do modelo de **designação de rotas**: **motoristas**, **coordenadores** e **admin**.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `migrations/0001_schema.sql` | (legado carona) Tipos, tabelas e índices |
| `migrations/0002_functions_triggers.sql` | (legado carona) Helpers + automações |
| `migrations/0003_rls_policies.sql` | (legado carona) Row Level Security |
| `migrations/0004_trip_cancellation.sql` | (legado carona) Cancelamento de viagem |
| `migrations/0005_route_assignment_pivot.sql` | **Pivot**: remove carona, adota designação de rotas |
| `schema_full.sql` | Estado final consolidado (instalação limpa) |
| `seed.sql` | Usuários e dados de teste (somente dev) |

> As migrations 0001–0004 são o histórico do MVP de carona; a 0005 transforma o banco
> no modelo atual. Para instalação **limpa** use `schema_full.sql`.

## Modelo

```
profiles (1:1 auth.users)  role: driver | coordinator | admin
  └─ drivers (cadastro do veículo, is_approved pelo admin)
routes (admin cria; título, origem, destino, horário, duração)
route_assignments (admin designa: rota + motorista + data)
route_requests (coordenador solicita criar/editar rota ──aprovação do admin──▶ routes)
```

## Papéis

- **Motorista** — cadastra o veículo e vê as rotas designadas a ele (`route_assignments`). Não escolhe rotas.
- **Coordenador** — solicita criação/edição de rotas (`route_requests`), vê rotas, motoristas e relatórios.
- **Admin** — cria rotas, designa motoristas, aprova motoristas e solicitações, cria contas, vê tudo.

## Automações (triggers)

- **Signup** → cria `profiles` lendo `name`/`role` do metadata (default `driver`).
- **Aprovar `route_request`** → aplica em `routes` (insere se `create`, atualiza se `edit`).
- **`is_approved` do motorista** → só admin altera.

## Permissões (resumo)

| Tabela | Leitura | Escrita |
|---|---|---|
| profiles | logados | próprio (nome); admin tudo. `role` só admin |
| drivers | logados | próprio cadastro; admin. Aprovação só admin |
| routes | logados (ativas); admin/coordenador todas | **só admin** |
| route_assignments | motorista dono, admin, coordenador | **só admin** |
| route_requests | requester (coordenador) e admin | coordenador cria/cancela; admin aprova/recusa |

---

## Como aplicar

### Opção A — Supabase CLI (recomendado, local)

```bash
npm i -g supabase            # ou: npx supabase ...
supabase init                # se ainda não houver supabase/config.toml
supabase start               # sobe Postgres + Studio local
supabase db reset            # aplica migrations/ (0001→0005) e roda seed.sql
```

### Opção B — Projeto na nuvem

No Dashboard → **SQL Editor**, para instalação limpa rode `schema_full.sql`.
Para um banco que já tinha o modelo antigo, rode apenas `0005_route_assignment_pivot.sql`.

## Criar contas pelo admin (Edge Function)

O app só tem a `anon key`, que não pode criar contas de terceiros. Para o admin criar
contas de motorista/coordenador há a função `functions/create-account`:

```bash
supabase functions deploy create-account
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

O motorista também pode se **autocadastrar** pelo app (fica pendente de aprovação do admin) —
isso não exige a Edge Function.

## Usuários de teste (seed) — senha `password123`

| Email | Perfil |
|---|---|
| admin@rotasflow.dev | admin |
| motorista@rotasflow.dev | driver (aprovado) |
| coordenador@rotasflow.dev | coordinator |
