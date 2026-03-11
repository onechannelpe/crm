# web

SolidStart application for the CRM UI, auth flows, client search, extension APIs, and background maintenance.

The request path starts in [`src/entry-server.tsx`](src/entry-server.tsx), mounts the router in [`src/app.tsx`](src/app.tsx), and passes through [`src/middleware.ts`](src/middleware.ts) on every request. Middleware sets the CSP nonce, request tracing data, and CSRF cookie, then delegates access control to [`src/lib/auth/access/request-auth.ts`](src/lib/auth/access/request-auth.ts). That auth layer treats public routes separately, validates the session cookie, redirects for login or onboarding, and stores the session on `event.locals`.

Authenticated pages share `src/routes/(app).tsx`. Public pages use `src/routes/(public).tsx`. Server functions live under [`src/actions/`](src/actions/). Read paths are wrapped in [`src/lib/queries/`](src/lib/queries/). Write paths are wrapped in [`src/lib/mutations/`](src/lib/mutations/). Domain services and repositories live under [`src/server/`](src/server/). Shared service wiring is in [`src/server/shared/context.ts`](src/server/shared/context.ts) and [`src/server/shared/registry.ts`](src/server/shared/registry.ts).

Database access starts in [`src/lib/db/client.ts`](src/lib/db/client.ts) and [`src/lib/db/db.ts`](src/lib/db/db.ts). Schema modules are under [`src/lib/db/schema/`](src/lib/db/schema/). Engine integration is configured in [`src/server/shared/engine/index.ts`](src/server/shared/engine/index.ts) and implemented in [`src/server/shared/engine/client.ts`](src/server/shared/engine/client.ts). Client search uses that engine client through [`src/server/client-search/service.ts`](src/server/client-search/service.ts). Lead assignment also depends on engine health and search through [`src/server/leads/service.ts`](src/server/leads/service.ts). Extension session and event APIs are under [`src/routes/api/extension/`](src/routes/api/extension/).

Configuration is loaded from the root `.env`. Required secrets are `SESSION_SECRET`, `TOTP_ENCRYPTION_KEY`, `ENGINE_HMAC_KEY_ID`, and `ENGINE_HMAC_SECRET`. The engine client defaults to `ENGINE_URL=http://localhost:3001`. WebAuthn defaults are `WEBAUTHN_RP_ID=localhost` and `WEBAUTHN_ORIGIN=http://localhost:5173`. Storage and proxy settings are `WEB_DB_PATH`, `WEB_UPLOADS_ROOT`, and `TRUSTED_PROXY`. Extension and OAuth settings are `EXTENSION_EXPECTED_ORIGIN`, `EXTENSION_HANDOFF_PRIVATE_KEY_PKCS8_BASE64`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`. Notification settings are `RESEND_API_KEY`, `EMAIL_FROM`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_GRAPH_API_VERSION`. Runtime definitions are in [`src/lib/env.ts`](src/lib/env.ts), [`src/lib/config.ts`](src/lib/config.ts), and [`app.config.ts`](app.config.ts).

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

`bun run start` serves the built application through Vite preview.

Validation commands:

```sh
bun run check
bun run check:web
bun run test
bun run test:prepare
bun run test:integration:browser
bun run test:perf
```

The app signs engine requests with HMAC credentials from the shared `.env`. The engine contract is in [`../../contracts/engine-api.json`](../../contracts/engine-api.json). Generated engine bindings are in [`src/server/shared/engine/contract.ts`](src/server/shared/engine/contract.ts). A practical first read order for contributors is [`src/middleware.ts`](src/middleware.ts), [`src/lib/auth/access/request-auth.ts`](src/lib/auth/access/request-auth.ts), `src/routes/(app).tsx`, [`src/actions/auth/login.ts`](src/actions/auth/login.ts), [`src/server/shared/context.ts`](src/server/shared/context.ts), [`src/server/shared/registry.ts`](src/server/shared/registry.ts), and [`src/server/shared/engine/client.ts`](src/server/shared/engine/client.ts).
