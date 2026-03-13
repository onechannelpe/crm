# The engine

Serves authenticated search requests over the published SQLite dataset.

Startup begins in [`src/main.rs`](src/main.rs). The binary loads the repo root `.env`, loads config from [`src/config/mod.rs`](src/config/mod.rs), checks that the SQLite file exists, builds the read-only connection pool, validates schema and projection-contract expectations in [`src/storage/sqlite/schema_guard.rs`](src/storage/sqlite/schema_guard.rs), constructs `AppState`, builds the router in [`src/api/router.rs`](src/api/router.rs), and starts the listener.

The request path for `POST /v1/search` starts in [`src/api/handlers.rs`](src/api/handlers.rs). The handler requires the auth headers, verifies HMAC signatures through [`src/security/hmac.rs`](src/security/hmac.rs), applies auth-failure and search rate limiting through [`src/security/rate_limit.rs`](src/security/rate_limit.rs), parses the JSON body, and calls [`src/domain/search_service.rs`](src/domain/search_service.rs). `SearchService` validates input by search type and dispatches to the SQLite query layer under [`src/storage/sqlite/queries/`](src/storage/sqlite/queries/). The health handler reads build metadata directly from SQLite and returns `degraded` when the projection is unavailable.

The engine reads the SQLite dataset in place. When the pipeline promotes a new snapshot, restart the process to load it.

HTTP surface:

```http
GET  /v1/health
POST /v1/search
```

`POST /v1/search` accepts this body:

```json
{
  "type": "dni | ruc | phone | person_name | company_name | phone_enriched",
  "value": "string",
  "limit": 20
}
```

`limit` defaults to `20`, is clamped to a minimum of `1`, and is capped by `ENGINE_MAX_LIMIT`.

Every `POST /v1/search` request requires `x-key-id`, `x-timestamp`, and `x-signature`. The signature format is `hex(hmac_sha256(timestamp_be_u64 + raw_body, secret))`.

Configuration is loaded from the repo root `.env`. `ENGINE_HMAC_KEYS_JSON` is required. Local defaults are `ENGINE_DB_PATH=crates/engine/data/contacts.sqlite`, `ENGINE_HOST=localhost`, and `ENGINE_PORT=3001`. Limit settings are `ENGINE_HMAC_MAX_SKEW_SECS`, `ENGINE_RATE_LIMIT_PER_KEY`, and `ENGINE_MAX_LIMIT`.

## Running

Refresh the SQLite dataset before starting the server:

```sh
bun run pipeline:refresh
```

Start the engine:

```sh
bun run dev:engine
```

## Validation

Validation commands:

```sh
bun run check:engine
bun run test:engine
```

## First reads

Start with [`src/main.rs`](src/main.rs), [`src/api/handlers.rs`](src/api/handlers.rs), and [`src/domain/search_service.rs`](src/domain/search_service.rs). Then read [`src/storage/sqlite/schema_guard.rs`](src/storage/sqlite/schema_guard.rs), [`src/storage/sqlite/queries/common.rs`](src/storage/sqlite/queries/common.rs), [`src/security/hmac.rs`](src/security/hmac.rs), and [`tests/api_search.rs`](tests/api_search.rs).
