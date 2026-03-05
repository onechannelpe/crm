# Engine

Rust/Axum read-only search API over SQLite (`contacts.sqlite`).

Use this README for runtime and API behavior. Data-generation workflows belong to [pipeline docs](../pipeline/readme.md).

## What it does

- Serves authenticated search queries against serving tables in SQLite.
- Validates inputs and enforces per-key rate limits.
- Exposes data-build metadata from `_pipeline_build` through health checks.

Implementation entry points:

- [apps/engine/src/main.rs](src/main.rs)
- [apps/engine/src/api/handlers.rs](src/api/handlers.rs)
- [apps/engine/src/domain/search_service.rs](src/domain/search_service.rs)
- [apps/engine/src/storage/sqlite/schema_guard.rs](src/storage/sqlite/schema_guard.rs)
- [apps/engine/src/storage/sqlite/queries/](src/storage/sqlite/queries/)

## Local workflow

Refresh DB snapshot first:

```sh
bun run pipeline:refresh
```

Run engine:

```sh
bun run dev:engine
```

If `contacts.sqlite` changes on disk, restart engine so the process picks up the new snapshot.

## API contract

Endpoints:

```http
GET  /v1/health
POST /v1/search
```

`POST /v1/search` request body ([contract](src/api/contracts.rs)):

```json
{
  "type": "dni | ruc | phone | person_name | company_name | phone_enriched",
  "value": "string",
  "limit": 20
}
```

`limit` behavior:

- default is `20`,
- lower-bounded to `1`,
- upper-bounded to `ENGINE_MAX_LIMIT`.

`GET /v1/health` includes build metadata when available (`build_id`, `built_at`, `rows`).

## Authentication and limits

Required headers for `POST /v1/search`:

- `x-key-id`
- `x-timestamp` (unix seconds)
- `x-signature`

Signature:

- `hex(hmac_sha256(timestamp_be_u64 + raw_body, secret_for_key_id))`

Auth is validated before query execution. Failed auth/search attempts are rate-limited per key (see [HMAC verifier](src/security/hmac.rs) and [rate limiter](src/security/rate_limit.rs)).

## Configuration

Environment is read from root [.env.example](../../.env.example) keys via [config loader](src/config/mod.rs).

- `ENGINE_HMAC_KEYS_JSON` (required)
- `ENGINE_DB_PATH` (default `apps/engine/data/contacts.sqlite`)
- `ENGINE_HOST` (default `localhost`)
- `ENGINE_PORT` (default `3001`)
- `ENGINE_HMAC_MAX_SKEW_SECS` (default `60`)
- `ENGINE_RATE_LIMIT_PER_KEY` (default `600`)
- `ENGINE_MAX_LIMIT` (default `100`)

## Verification

```sh
bun run test:engine
bun run check:engine
```
