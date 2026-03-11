# web

SolidStart app that serves the CRM UI, handles all auth, manages lead assignment and contact state, exposes APIs for the browser extension, and runs a background maintenance worker. It's the largest app in the monorepo and the one most things depend on.

## Request flow

Every request enters at [`src/entry-server.tsx`](src/entry-server.tsx) and hits [`src/middleware.ts`](src/middleware.ts) before anything else. Middleware sets the CSP nonce, attaches request tracing, writes the CSRF cookie, and hands off to [`src/lib/auth/access/request-auth.ts`](src/lib/auth/access/request-auth.ts). That module is the gatekeeper: public routes pass through, everything else gets its session cookie validated, with redirects to login or onboarding as appropriate. The session lands on `event.locals` and flows through to every server function from there.

Past middleware, authenticated routes live under `src/routes/(app).tsx` and public routes under `src/routes/(public).tsx`. Server functions are in [`src/actions/`](src/actions/). Read paths are wrapped in [`src/lib/queries/`](src/lib/queries/) and write paths in [`src/lib/mutations/`](src/lib/mutations/). Domain services and repositories are under [`src/server/`](src/server/). If you're trying to understand how a feature is wired together, start in `src/actions/`, follow the call into `src/lib/mutations/` or `src/lib/queries/`, and you'll find the service and repo in `src/server/`. The service context and dependency wiring are in [`src/server/shared/context.ts`](src/server/shared/context.ts) and [`src/server/shared/registry.ts`](src/server/shared/registry.ts).

## Engine integration

The web app calls the engine for all contact search. The client in [`src/server/shared/engine/client.ts`](src/server/shared/engine/client.ts) signs every request with HMAC credentials and handles retries and error mapping. Configuration is in [`src/server/shared/engine/index.ts`](src/server/shared/engine/index.ts). The generated TypeScript bindings from `contracts/engine-api.json` live in [`src/server/shared/engine/contract.ts`](src/server/shared/engine/contract.ts) — regenerate them with `bun run generate` if you change the contract.

Client search flows through [`src/server/client-search/service.ts`](src/server/client-search/service.ts). Lead assignment in [`src/server/leads/service.ts`](src/server/leads/service.ts) also depends on the engine — it checks engine health before assigning and uses search to enrich leads.

## Database

The web app has its own SQLite database, separate from the engine's contacts snapshot. Access is initialized in [`src/lib/db/client.ts`](src/lib/db/client.ts) and [`src/lib/db/db.ts`](src/lib/db/db.ts). Schema modules are numbered and live under [`src/lib/db/schema/`](src/lib/db/schema/).

## Background worker

The maintenance worker is a separate process (`bun run dev:worker`) that handles async jobs — things that shouldn't block a request but need to happen reliably. It's not part of the Vite dev server, so if you're working on anything that touches background processing, you need it running separately.

## Extension APIs

The web app is the server side of the extension protocol. It issues handoff tokens at [`src/routes/api/extension/handoff-token.ts`](src/routes/api/extension/handoff-token.ts), manages extension sessions at `src/routes/api/extension/session/`, and receives queued events at [`src/routes/api/extension/events.ts`](src/routes/api/extension/events.ts). The server-side persistence for extension data is in [`src/server/extension/service.ts`](src/server/extension/service.ts) and [`src/server/extension/repos.ts`](src/server/extension/repos.ts).

## Configuration

Config is loaded from the repo-root `.env`. Definitions are in [`src/lib/env.ts`](src/lib/env.ts), [`src/lib/config.ts`](src/lib/config.ts), and [`app.config.ts`](app.config.ts).

| Variable | Default | Notes |
|---|---|---|
| `SESSION_SECRET` | — | Required |
| `TOTP_ENCRYPTION_KEY` | — | Required |
| `ENGINE_HMAC_KEY_ID` | — | Required |
| `ENGINE_HMAC_SECRET` | — | Required |
| `ENGINE_URL` | `http://localhost:3001` | |
| `WEBAUTHN_RP_ID` | `localhost` | |
| `WEBAUTHN_ORIGIN` | `http://localhost:5173` | |
| `WEB_DB_PATH` | — | SQLite database path |
| `WEB_UPLOADS_ROOT` | — | File upload directory |
| `TRUSTED_PROXY` | — | |
| `EXTENSION_EXPECTED_ORIGIN` | — | Extension allowed origin |
| `EXTENSION_HANDOFF_PRIVATE_KEY_PKCS8_BASE64` | — | Handoff token signing key |
| `GOOGLE_CLIENT_ID` | — | OAuth |
| `GOOGLE_CLIENT_SECRET` | — | OAuth |
| `GOOGLE_REDIRECT_URI` | — | OAuth |
| `RESEND_API_KEY` | — | Email |
| `EMAIL_FROM` | — | Email sender address |
| `WHATSAPP_ACCESS_TOKEN` | — | |
| `WHATSAPP_PHONE_NUMBER_ID` | — | |
| `WHATSAPP_GRAPH_API_VERSION` | — | |

## Running

From the repo root:

```sh
bun run dev        # runs migrations and seeds, then starts Vite + engine
bun run dev:web    # web app only
bun run dev:worker # maintenance worker only
```

From `apps/web/`:

```sh
bun run dev
bun run worker:maintenance
bun run build
bun run start
```

## Validation

```sh
bun run check
bun run check:web
bun run test
bun run test:integration:browser
bun run test:perf
```
