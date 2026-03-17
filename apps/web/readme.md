# The web

Serves the CRM UI, the CRM API routes, and the background maintenance worker.

The request path starts in [`src/entry-server.tsx`](src/entry-server.tsx) and mounts the router in [`src/app.tsx`](src/app.tsx). Every request passes through [`src/middleware.ts`](src/middleware.ts). Middleware sets the CSP nonce, request tracing fields, and CSRF cookie, then delegates access control to [`src/lib/auth/access/request-auth.ts`](src/lib/auth/access/request-auth.ts). That auth layer handles public paths separately, validates the session cookie, redirects for login or onboarding, and stores the session on `event.locals`.

Authenticated pages live under [`src/routes/(app).tsx`](src/routes/%28app%29.tsx). Public pages live under [`src/routes/(public).tsx`](src/routes/%28public%29.tsx). Server functions live under [`src/actions/`](src/actions/). Read wrappers live under [`src/lib/queries/`](src/lib/queries/). Write wrappers live under [`src/lib/mutations/`](src/lib/mutations/). Domain services and repositories live under [`src/server/`](src/server/). Shared wiring lives in [`src/server/shared/context.ts`](src/server/shared/context.ts) and [`src/server/shared/registry.ts`](src/server/shared/registry.ts).

Most feature work follows the same path. A route calls a server function in [`src/actions/`](src/actions/). The action calls a service under [`src/server/`](src/server/), and the service uses repositories from [`src/server/shared/registry.ts`](src/server/shared/registry.ts). Database access starts in [`src/lib/db/client.ts`](src/lib/db/client.ts) and [`src/lib/db/db.ts`](src/lib/db/db.ts). Schema modules live under [`src/lib/db/schema/`](src/lib/db/schema/).

Search and candidate discovery are the main cross-service dependencies. Engine integration is configured in [`src/server/shared/engine/index.ts`](src/server/shared/engine/index.ts) and implemented in [`src/server/shared/engine/client.ts`](src/server/shared/engine/client.ts). Direct search flows through [`src/actions/search/use.ts`](src/actions/search/use.ts) and [`src/server/engine-gateway/search-service.ts`](src/server/engine-gateway/search-service.ts). Lead refill flows through [`src/actions/lead-operations/refill.ts`](src/actions/lead-operations/refill.ts), [`src/server/lead-operations/refill-service.ts`](src/server/lead-operations/refill-service.ts), and [`src/server/engine-gateway/lead-candidate-service.ts`](src/server/engine-gateway/lead-candidate-service.ts). Extension session and event APIs live under [`src/routes/api/extension/`](src/routes/api/extension/).

Configuration is loaded from env files selected by the script or passed by the caller.

| Setting group       | Variables                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Core auth           | `SESSION_SECRET`, `TOTP_ENCRYPTION_KEY`, `ENGINE_HMAC_KEY_ID`, `ENGINE_HMAC_SECRET`                                                          |
| Engine client       | `ENGINE_CONNECT_MODE`, `ENGINE_URL`                                                                                                          |
| WebAuthn            | `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`                                                                                                          |
| Storage and proxy   | `WEB_DB_PATH`, `WEB_UPLOADS_ROOT`, `TRUSTED_PROXY`                                                                                           |
| Extension and OAuth | `EXTENSION_EXPECTED_ORIGIN`, `EXTENSION_HANDOFF_PRIVATE_KEY_PKCS8_BASE64`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Notifications       | `RESEND_API_KEY`, `EMAIL_FROM`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_API_VERSION`                            |

The engine client defaults to `ENGINE_CONNECT_MODE=local` and `ENGINE_URL=http://127.0.0.1:3001`. Local mode requires a loopback `http` endpoint so the engine stays private to the host. Remote mode requires an `https` endpoint. WebAuthn defaults are `WEBAUTHN_RP_ID=localhost` and `WEBAUTHN_ORIGIN=http://localhost:5173`. Definitions live in [`src/lib/env.ts`](src/lib/env.ts), [`src/lib/config.ts`](src/lib/config.ts), and [`vite.config.ts`](vite.config.ts).

## Running

Run from the repo root:

```sh
bun run dev
bun run dev:web
bun run dev:worker
```

`bun run dev` starts the web app and runs migrations and seeds before starting Vite. `bun run dev:worker` starts `worker:maintenance`.

Run from `apps/web/`:

```sh
bun run dev
bun run migrate
bun run seed
bun run build
bun run test
bun run test:prepare
bun run test:server
bun run worker:maintenance
bun --env-file=../../.env.production run start
bun --env-file=../../.env.production run migrate:prod
bun --env-file=../../.env.production run seed:prod
bun --env-file=../../.env.production run worker:maintenance:prod
```

Local scripts choose their default env file automatically. Production entrypoints stay explicit through `start`, `migrate:prod`, `seed:prod`, and `worker:maintenance:prod`.

## Production

Production is Bun-first.
Use the app-local Bun commands directly.
For a real server, prefer keeping secrets outside the repo and pass an explicit env file path.

Build from `apps/web/`:

```sh
bun run build
```

Run migrations:

```sh
bun --env-file=../../.env.production run migrate:prod
```

Run seeds if needed:

```sh
bun --env-file=../../.env.production run seed:prod
```

Start the web server:

```sh
bun --env-file=../../.env.production run start
```

Start the maintenance worker:

```sh
bun --env-file=../../.env.production run worker:maintenance
```

Systemd unit examples live in [`../../ops/systemd/web.service`](../../ops/systemd/web.service) and [`../../ops/systemd/web-worker.service`](../../ops/systemd/web-worker.service).

## Validation

Validation commands:

```sh
bun run check:web
bun run test
bun run test:prepare
bun run test:integration:browser
bun run test:perf
```

## First reads

The engine contract is [`engine-api.json (contracts)`](../../contracts/engine-api.json). Generated bindings live in [`src/server/shared/engine/contract.ts`](src/server/shared/engine/contract.ts).

Start with [`src/middleware.ts`](src/middleware.ts) and [`src/lib/auth/access/request-auth.ts`](src/lib/auth/access/request-auth.ts) for request and session flow. Then read [`src/actions/auth/login.ts`](src/actions/auth/login.ts), [`src/server/shared/context.ts`](src/server/shared/context.ts), and [`src/server/shared/registry.ts`](src/server/shared/registry.ts). For search or lead refill, continue with [`src/server/shared/engine/client.ts`](src/server/shared/engine/client.ts), [`src/server/engine-gateway/search-service.ts`](src/server/engine-gateway/search-service.ts), and [`src/server/engine-gateway/lead-candidate-service.ts`](src/server/engine-gateway/lead-candidate-service.ts).
