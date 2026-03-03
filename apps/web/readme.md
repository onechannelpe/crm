# web

SolidStart application. See [root readme](../../readme.md) for project overview.

## Environment

Read from root [`.env`](../../.env):

- `SESSION_SECRET` (required): must be high entropy (min 32 chars, min 10 unique chars)
- `ENGINE_HMAC_KEY_ID` (required): key id used when signing requests to engine
- `ENGINE_HMAC_SECRET` (required): authenticates requests to engine. Must be high entropy (min 32 chars, min 10 unique chars)
- `ENGINE_URL` (default `http://localhost:3001`): must be `https` and non-localhost in production
- `NODE_ENV` (default `development`)
- `WEBAUTHN_RP_ID` (default `localhost`)
- `WEBAUTHN_ORIGIN` (default `http://localhost:3000`)

See [`app.config.ts`](app.config.ts) for vite configuration.

## Commands

From repo root:

```sh
bun run dev               # dev server
bun run check             # typecheck + lint
```

From `apps/web/`:

```sh
bun run test              # unit/integration tests
bun run test:perf         # benchmarks
bun run migrate           # run pending migrations
bun run seed              # seed dev data
```

## Deploy

Web server and worker run as separate processes:

```sh
bun run start                          # web server
bun run worker:sales-export-jobs       # continuous export worker
bun run worker:sales-export-jobs:once  # one-shot run
```

## Engine integration

Web calls engine via HMAC-signed HTTP. Client bindings are generated from the contract.

- Contract source: [`../../contracts/engine-api.json`](../../contracts/engine-api.json)
- Generated client: [`src/server/shared/engine/contract.ts`](src/server/shared/engine/contract.ts)
- Search UI wiring: [`src/server/client-search/`](src/server/client-search/)
