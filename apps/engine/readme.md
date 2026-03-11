# engine

The engine does one thing: take a signed search request and return rows from the contacts dataset. It doesn't write, it doesn't migrate, it doesn't own its data. That simplicity is intentional — keeping search isolated as a read-only Rust process means it can't become a bottleneck or a source of data corruption, and it's trivially restartable when the pipeline promotes a new snapshot.

## The request path

A `POST /v1/search` comes in, gets authenticated via HMAC in [`src/security/hmac.rs`](src/security/hmac.rs), rate-limited per key in [`src/security/rate_limit.rs`](src/security/rate_limit.rs), then handed to [`src/domain/search_service.rs`](src/domain/search_service.rs). The service validates the search type and dispatches to the right query under [`src/storage/sqlite/queries/`](src/storage/sqlite/queries/) — exact lookups (DNI, RUC, phone), text search (names), and enriched phone search each have their own file. Results come back and go out. That's the whole path.

On startup, before the server accepts any connections, [`src/storage/sqlite/schema_guard.rs`](src/storage/sqlite/schema_guard.rs) validates that the SQLite file matches the expected schema and projection contract. If it doesn't, the process exits. Read that file before touching any query code — it's the enforcement layer for the pipeline→engine contract and it will bite you if you skip it.

The engine doesn't watch `contacts.sqlite` for changes. When the pipeline promotes a new snapshot, restart the process to pick it up.

## HTTP surface

```
GET  /v1/health
POST /v1/search
```

`/v1/health` returns build metadata from SQLite (`build_id`, `built_at`, `rows`) and reports `degraded` when the projection is unavailable.

`/v1/search` request body:

```json
{
  "type": "dni | ruc | phone | person_name | company_name | phone_enriched",
  "value": "string",
  "limit": 20
}
```

`limit` defaults to `20`, minimum `1`, maximum `ENGINE_MAX_LIMIT`.

Every `/v1/search` request requires three headers:

| Header | Value |
|---|---|
| `x-key-id` | Key identifier |
| `x-timestamp` | Unix seconds |
| `x-signature` | `hex(hmac_sha256(timestamp_be_u64 + raw_body, secret))` |

Auth is checked before any query runs. Both auth failures and search attempts count against the per-key rate limit.

## Configuration

All config comes from the repo-root `.env`.

| Variable | Default | Notes |
|---|---|---|
| `ENGINE_HMAC_KEYS_JSON` | — | Required. JSON map of key ID → secret |
| `ENGINE_DB_PATH` | `apps/engine/data/contacts.sqlite` | |
| `ENGINE_HOST` | `localhost` | |
| `ENGINE_PORT` | `3001` | |
| `ENGINE_HMAC_MAX_SKEW_SECS` | — | Timestamp skew tolerance |
| `ENGINE_RATE_LIMIT_PER_KEY` | — | Max requests per key per window |
| `ENGINE_MAX_LIMIT` | — | Upper bound on `limit` in search requests |

## Running

The SQLite file must exist before the engine starts. If you haven't run the pipeline yet:

```sh
bun run pipeline:refresh
```

Then start the engine:

```sh
bun run dev:engine
```

## Validation

```sh
bun run check:engine
bun run test:engine
```
