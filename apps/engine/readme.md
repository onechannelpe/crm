# Engine

Rust/Axum search API over the published SQLite dataset. The process reads `contacts.sqlite`, validates authenticated requests, and serves `/v1/health` and `/v1/search`.

Startup begins in [`src/main.rs`](src/main.rs). The binary loads the repo-root `.env`, loads config from [`src/config/mod.rs`](src/config/mod.rs), checks that the SQLite file exists, builds the read-only connection pool, validates schema and projection-contract expectations in [`src/storage/sqlite/schema_guard.rs`](src/storage/sqlite/schema_guard.rs), constructs `AppState`, builds the router in [`src/api/router.rs`](src/api/router.rs), and starts the listener.

Refresh the SQLite dataset before starting the server:

```sh
bun run pipeline:refresh
```

Start the server:

```sh
bun run dev:engine
```

If `contacts.sqlite` changes on disk, restart engine so the process picks up the new snapshot.

The request path for `POST /v1/search` starts in [`src/api/handlers.rs`](src/api/handlers.rs). The handler requires the auth headers, verifies HMAC signatures through [`src/security/hmac.rs`](src/security/hmac.rs), applies auth-failure rate limiting and search rate limiting through [`src/security/rate_limit.rs`](src/security/rate_limit.rs), parses the JSON body, and calls [`src/domain/search_service.rs`](src/domain/search_service.rs). `SearchService` validates input by search type and dispatches to the SQLite query layer under [`src/storage/sqlite/queries/`](src/storage/sqlite/queries/). The health handler reads build metadata directly from SQLite and returns `degraded` when the projection is unavailable.

Configuration is loaded from the root `.env` through [`src/config/mod.rs`](src/config/mod.rs). `ENGINE_HMAC_KEYS_JSON` is required. Local defaults are `ENGINE_DB_PATH=apps/engine/data/contacts.sqlite`, `ENGINE_HOST=localhost`, and `ENGINE_PORT=3001`. Limit settings are `ENGINE_HMAC_MAX_SKEW_SECS`, `ENGINE_RATE_LIMIT_PER_KEY`, and `ENGINE_MAX_LIMIT`.

HTTP surface:

```http
GET  /v1/health
POST /v1/search
```

`POST /v1/search` accepts this body shape from [`src/api/contracts.rs`](src/api/contracts.rs):

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

`POST /v1/search` requires these headers:

- `x-key-id`
- `x-timestamp` (unix seconds)
- `x-signature`

Signature:

- `hex(hmac_sha256(timestamp_be_u64 + raw_body, secret_for_key_id))`

Auth is validated before query execution. Failed auth and search attempts are rate-limited per key. Error-to-HTTP mapping is in [`src/errors/mod.rs`](src/errors/mod.rs). Connection setup is in [`src/storage/sqlite/connection.rs`](src/storage/sqlite/connection.rs). Query entrypoints are split across exact, text, and enriched search files under [`src/storage/sqlite/queries/`](src/storage/sqlite/queries/).

Validation commands are `bun run test:engine` and `bun run check:engine`. A practical first read order is [`src/main.rs`](src/main.rs), [`src/api/handlers.rs`](src/api/handlers.rs), [`src/domain/search_service.rs`](src/domain/search_service.rs), [`src/storage/sqlite/schema_guard.rs`](src/storage/sqlite/schema_guard.rs), [`src/storage/sqlite/queries/common.rs`](src/storage/sqlite/queries/common.rs), [`src/security/hmac.rs`](src/security/hmac.rs), and [`tests/api_search.rs`](tests/api_search.rs).
