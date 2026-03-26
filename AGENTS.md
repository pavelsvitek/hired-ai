<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## API routing (Hono)

Non-auth JSON/binary APIs live under `app/api/<entity>/[...route]/route.ts` as a Hono app with `basePath('/api/<entity>')`, exported handlers via `handle` from `hono/vercel`. Auth APIs stay on Better Auth’s catch-all route (`app/api/auth/[...all]/route.ts`). Reuse session middleware in `lib/hono/require-auth.ts` for protected routers.

## Domain models & TanStack Query

Colocate client data logic per entity under `src/models/<entity>/`:

| File           | Purpose                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `types.ts`     | Re-export Drizzle row types from `db/schema` with stable names; add API DTOs (`Pick`/`Omit` / small interfaces). Do **not** duplicate column types. |
| `queries.ts`   | Query key factory (`candidateKeys`), fetchers, and `useQuery` hooks (`"use client"`). |
| `mutations.ts` | `useMutation` hooks; invalidate sibling query keys from `queries.ts` on success.   |

Import models with the `@/models/...` path alias (`tsconfig.json` maps `@/models/*` to `./src/models/*`).

**Types:** `InferSelectModel` / exported aliases in `db/schema` are the source of truth for persisted rows. Composites for UI or API responses should be built with `Pick`, `Omit`, or separate DTO types that reference row types — not parallel stringly-typed fields.

Wrap feature surfaces that use these hooks with `QueryClientProvider` (e.g. `components/candidates-query-provider.tsx` in the candidates layout).
