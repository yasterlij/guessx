# AGENTS.md

Guidance for AI agents working in this repo.

## Build / test / lint commands

### Backend services (run inside each service dir)
- Build: `npm run build` (nest build)
- Tests: `npm test` (jest)
- Type check: `npx tsc --noEmit`
- Dev: `npm run start:dev`

### Frontends
- Web (`guessx-web/`): `npm run dev` (Vite), build `npm run build`, type check `npx tsc --noEmit`
- Mobile (`guessx-app/`): `npx expo start`, type check `npx tsc --noEmit`

### Root orchestration
- `npm run dev` — Docker infra + 3 backends + web
- `npm run app` — Expo mobile
- `npm run db:setup` — Docker -> migrate -> seed
- `npm run db:reset` — wipe + migrate + seed

Always run `npx tsc --noEmit` and `npm test` in a service after editing it.

## Architecture notes

- 3 NestJS microservices share one Postgres + one Redis. JWT secret must be identical across services (tokens are issued by identity-service and verified by all three).
- Migrations are raw SQL in `database/migrations/`, applied via `scripts/migrate-raw.sh` with a `schema_migrations` tracking table. They are idempotent (`IF NOT EXISTS`) and re-runnable.
- The auction winner algorithm uses Redis ZSETs (`frequencies` + `unique_bids`). See `SRS.md` §6.1.
- Shared HTTP client lives in `packages/guessx-api` (`@guessx/api`). Web/mobile `src/api.ts` are thin config wrappers. `AppContext.tsx` is still duplicated per platform.

## Conventions

- No comments in code unless explicitly requested.
- Match existing style: NestJS services use double quotes in auction-engine, single quotes in identity/query-service — follow the file you're editing.
- Never commit `.env` files (gitignored). Use `.env.example` as the template.
- Health endpoints return HTTP 503 when degraded (DB/Redis down).
- Internal API keys and webhook signatures use constant-time comparison (`crypto.timingSafeEqual` with length guard).
- Exception filters mask 5xx details from clients; raw errors are logged server-side.

## Before committing

1. `npx tsc --noEmit` in every changed project (5 projects total).
2. `npm test` in every changed backend service.
3. Do not commit secrets, `*.log`, `dist/`, `node_modules/`, `.idea/`, `INPUT_PATH/`.
