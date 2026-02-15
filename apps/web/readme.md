# one-crm

solidstart crm application.

## quick start

start the web app from repo root:

```sh
bun run dev:web
```

## environment

source: [root `.env`](../../.env)

required:

- `SESSION_SECRET`
- `ENGINE_HMAC_SECRET`

common:

- `NODE_ENV` (default `development`)
- `ENGINE_URL` (default `http://localhost:3001`)
- `WEBAUTHN_RP_ID` (default `localhost`)
- `WEBAUTHN_ORIGIN` (default `http://localhost:3000`)

note:

- engine runtime vars are namespaced as `ENGINE_*` to avoid web env collisions.

production guards (code-enforced):

- engine url must use `https`
- engine url must not target localhost
- engine url must not include credentials/query/fragment

## commands

run web checks from repo root:

```sh
bun run check:web
```

run web-local workflows from `apps/web`:

```sh
bun run test
bun run test:perf
bun run migrate
bun run seed
```

## references

- engine contract output in web: [`src/server/shared/engine/contract.ts`](src/server/shared/engine/contract.ts)
- canonical contract source: [`../../contracts/engine-api.json`](../../contracts/engine-api.json)
- script details: [`package.json`](package.json)
