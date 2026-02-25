# web

SolidStart CRM application. See [root readme](../../readme.md) for project overview.

## Environment

Read from root [`.env`](../../.env):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SESSION_SECRET` | yes | | |
| `ENGINE_HMAC_SECRET` | yes | | Authenticates requests to engine |
| `ENGINE_URL` | | `http://localhost:3001` | Must be `https` and non-localhost in production |
| `NODE_ENV` | | `development` | |
| `WEBAUTHN_RP_ID` | | `localhost` | |
| `WEBAUTHN_ORIGIN` | | `http://localhost:3000` | |

See [`app.config.ts`](app.config.ts) for full configuration.

## Commands

From repo root:

```sh
bun run dev:web                        # dev server
bun run check:web                      # typecheck + lint
```

From `apps/web/`:

```sh
bun run test                           # unit/integration tests
bun run test:perf                      # benchmarks
bun run migrate                        # run pending migrations
bun run seed                           # seed dev data
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

| Path | Role |
|---|---|
| [`../../contracts/engine-api.json`](../../contracts/engine-api.json) | Contract source of truth |
| [`src/server/shared/engine/contract.ts`](src/server/shared/engine/contract.ts) | Generated client bindings |
| [`src/server/client-search/`](src/server/client-search/) | Search UI wiring |
