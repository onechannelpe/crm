# one-engine

rust/axum service for lead/contact search.

## quick start

start the engine from repo root:

```sh
bun run dev:engine
```

## api

base prefix is generated in [`src/api/contract.rs`](src/api/contract.rs).

endpoints:

```txt
GET  /v1/health
POST /v1/search
```

`POST /v1/search` signing:

- `x-timestamp`: unix seconds
- `x-signature`: `hex(hmac_sha256(timestamp_be_u64 + raw_body, ENGINE_HMAC_SECRET))`

request body:

```json
{
  "type": "dni | ruc | phone | name",
  "value": "string",
  "limit": 20
}
```

## configuration

source: [root `.env`](../../.env)

- `ENGINE_HMAC_SECRET` (required)
- `ENGINE_HOST` (default `127.0.0.1`)
- `ENGINE_PORT` (default `3001`)
- `ENGINE_DATA_PATH` (default `<engine-crate>/data/contacts.csv`)
- `ENGINE_RATE_LIMIT_PER_IP` (default `120`)

## commands

run engine checks from repo root:

```sh
bun run check:engine
```

run engine tests:

```sh
cargo test --manifest-path apps/engine/Cargo.toml
```

## references

- contract source of truth: [`../../contracts/engine-api.json`](../../contracts/engine-api.json)
- generated contract constants: [`src/api/contract.rs`](src/api/contract.rs)
- script details: [`../../package.json`](../../package.json)
