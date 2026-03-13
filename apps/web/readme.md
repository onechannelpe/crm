# The web

Serves the CRM UI, the CRM API routes, and the background maintenance worker.

The request path starts in [`src/entry-server.tsx`](src/entry-server.tsx) and mounts the router in [`src/app.tsx`](src/app.tsx). Every request passes through [`src/middleware.ts`](src/middleware.ts). Middleware sets the CSP nonce, request tracing fields, and CSRF cookie, then delegates access control to [`src/lib/auth/access/request-auth.ts`](src/lib/auth/access/request-auth.ts). That auth layer handles public paths separately, validates the session cookie, redirects for login or onboarding, and stores the session on `event.locals`.

Authenticated pages live under [`src/routes/(app).tsx`](src/routes/%28app%29.tsx). Public pages live under [`src/routes/(public).tsx`](src/routes/%28public%29.tsx). Server functions live under [`src/actions/`](src/actions/). Read wrappers live under [`src/lib/queries/`](src/lib/queries/). Write wrappers live under [`src/lib/mutations/`](src/lib/mutations/). Domain services and repositories live under [`src/server/`](src/server/). Shared wiring lives in [`src/server/shared/context.ts`](src/server/shared/context.ts) and [`src/server/shared/registry.ts`](src/server/shared/registry.ts).

Most feature work follows the same path. A route calls a server function in [`src/actions/`](src/actions/). The action calls a service under [`src/server/`](src/server/), and the service uses repositories from [`src/server/shared/registry.ts`](src/server/shared/registry.ts). Database access starts in [`src/lib/db/client.ts`](src/lib/db/client.ts) and [`src/lib/db/db.ts`](src/lib/db/db.ts). Schema modules live under [`src/lib/db/schema/`](src/lib/db/schema/).

Search is the main cross-service dependency. Engine integration is configured in [`src/server/shared/engine/index.ts`](src/server/shared/engine/index.ts) and implemented in [`src/server/shared/engine/client.ts`](src/server/shared/engine/client.ts). Client search flows through [`src/server/client-search/service.ts`](src/server/client-search/service.ts). Lead assignment also depends on engine health and search state through [`src/server/leads/service.ts`](src/server/leads/service.ts). Extension session and event APIs live under [`src/routes/api/extension/`](src/routes/api/extension/).

Configuration is loaded from the repo root `.env`.

| Setting group       | Variables                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Core auth           | `SESSION_SECRET`, `TOTP_ENCRYPTION_KEY`, `ENGINE_HMAC_KEY_ID`, `ENGINE_HMAC_SECRET`                                                          |
| Engine client       | `ENGINE_URL`                                                                                                                                 |
| WebAuthn            | `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`                                                                                                          |
| Storage and proxy   | `WEB_DB_PATH`, `WEB_UPLOADS_ROOT`, `TRUSTED_PROXY`                                                                                           |
| Extension and OAuth | `EXTENSION_EXPECTED_ORIGIN`, `EXTENSION_HANDOFF_PRIVATE_KEY_PKCS8_BASE64`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Notifications       | `RESEND_API_KEY`, `EMAIL_FROM`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_API_VERSION`                            |

The engine client defaults to `ENGINE_URL=http://localhost:3001`. WebAuthn defaults are `WEBAUTHN_RP_ID=localhost` and `WEBAUTHN_ORIGIN=http://localhost:5173`. Definitions live in [`src/lib/env.ts`](src/lib/env.ts), [`src/lib/config.ts`](src/lib/config.ts), and [`app.config.ts`](app.config.ts).

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
bun run worker:maintenance
bun run build
bun run start
```

`bun run start` serves the built Nitro node server.

## Production

Production is Node-first.
Use Bun for dependency installation in the monorepo, then build and run the web app through Node entrypoints.
The production env file lives at the repo root as `.env` by default.
Set `WEB_ENV_FILE=/path/to/.env` to use a different file.
For a real server, prefer keeping secrets outside the repo and point `WEB_ENV_FILE` at that path.

Build from the repo root:

```sh
./scripts/prod/web-build.sh
```

Run migrations:

```sh
./scripts/prod/web-migrate.sh
```

Start the web server:

```sh
./scripts/prod/web-start.sh
```

Start the maintenance worker:

```sh
./scripts/prod/web-worker.sh
```

Systemd unit examples live in [`../../ops/systemd/web.service`](../../ops/systemd/web.service) and [`../../ops/systemd/web-worker.service`](../../ops/systemd/web-worker.service).

## Validation

Validation commands:

```sh
bun run check
bun run check:web
bun run test
bun run test:prepare
bun run test:integration:browser
bun run test:perf
```

## First reads

The engine contract is [`engine-api.json (contracts)`](../../contracts/engine-api.json). Generated bindings live in [`src/server/shared/engine/contract.ts`](src/server/shared/engine/contract.ts).

Start with [`src/middleware.ts`](src/middleware.ts) and [`src/lib/auth/access/request-auth.ts`](src/lib/auth/access/request-auth.ts) for request and session flow. Then read [`src/actions/auth/login.ts`](src/actions/auth/login.ts), [`src/server/shared/context.ts`](src/server/shared/context.ts), and [`src/server/shared/registry.ts`](src/server/shared/registry.ts). For contact search or lead assignment, continue with [`src/server/shared/engine/client.ts`](src/server/shared/engine/client.ts).
