# web

SolidStart application. See [root readme](../../readme.md) for project overview.

## Environment

Read from root [`.env`](../../.env):

- `SESSION_SECRET` (required): must be high entropy (min 32 chars, min 10 unique chars)
- `TOTP_ENCRYPTION_KEY` (required): must be high entropy and differ from `SESSION_SECRET`
- `ENGINE_HMAC_KEY_ID` (required): key id used when signing requests to engine
- `ENGINE_HMAC_SECRET` (required): authenticates requests to engine. Must be high entropy (min 32 chars, min 10 unique chars)
- `ENGINE_URL` (default `http://localhost:3001`): must be `https` and non-localhost in production
- `NODE_ENV` (default `development`)
- `TRUSTED_PROXY` (default `false`): enable only behind a trusted reverse proxy
- `WEBAUTHN_RP_ID` (default `localhost`)
- `WEBAUTHN_ORIGIN` (default `http://localhost:5173`)
- `EXTENSION_EXPECTED_ORIGIN` (default `http://localhost:3000`)

See [`app.config.ts`](app.config.ts) for vite configuration.

## Commands

From repo root:

```sh
bun run dev               # engine + web in parallel
bun run dev:web           # web only; runs migrate + seed, then starts Vite
bun run dev:worker        # background maintenance worker
bun run check             # full repo validation
bun run check:web         # web typecheck + lint
```

From `apps/web/`:

```sh
bun run test              # unit/integration tests
bun run test:prepare      # migrate + seed the test database
bun run test:integration:browser
bun run test:perf         # benchmarks
bun run migrate           # run pending migrations
bun run seed              # seed dev data
bun run build             # production build
bun run start             # preview the production build
bun run worker:maintenance
```

## Runtime notes

- `bun run dev` in `apps/web/` runs migrations and seeds before starting Vite.
- `bun run start` is a preview server for the built app.
- Long-running background jobs are started by `worker:maintenance`.

## Engine integration

Web calls engine via HMAC-signed HTTP. Client bindings are generated from the contract.

- Contract source: [`../../contracts/engine-api.json`](../../contracts/engine-api.json)
- Generated client: [`src/server/shared/engine/contract.ts`](src/server/shared/engine/contract.ts)
- Search UI wiring: [`src/server/client-search/`](src/server/client-search/)
