# engine

Rust/Axum contact search API backed by read-only SQLite. See [root readme](../../readme.md) for project overview.

## Data pipeline

Engine reads from `apps/engine/data/contacts.sqlite`, a read-only SQLite snapshot built by the [processing pipeline](../pipeline/readme.md). Swapping the file requires an engine restart.

## API

```
GET  /v1/health
POST /v1/search
```

### POST /v1/search

HMAC-authenticated. See [`src/security/hmac.rs`](src/security/hmac.rs) for implementation.

Required headers:

- `x-key-id`: key id configured in `ENGINE_HMAC_KEYS_JSON`
- `x-timestamp`: unix seconds
- `x-signature`: `hex(hmac_sha256(timestamp_be_u64 + raw_body, secret_for_key_id))`

Body:

```json
{
  "type": "dni | ruc | phone | person_name | company_name | phone_enriched",
  "value": "string",
  "limit": 20
}
```

Response: `{ results: SearchRow[], count: number }`

## Config

Read from root [`.env`](../../.env):

- `ENGINE_HMAC_KEYS_JSON` (required): JSON object of signing keys, e.g. `{"web":"secret"}`
- `ENGINE_PORT` (default `3001`)
- `ENGINE_HOST` (default `127.0.0.1`)
- `ENGINE_DB_PATH` (default `apps/engine/data/contacts.sqlite`)
- `ENGINE_RATE_LIMIT_PER_KEY` (default `600`): token bucket refill per minute per key id
- `ENGINE_MAX_LIMIT` (default `100`): max results per query

## Testing

```sh
bun run test:engine
```

See [`tests/perf_regression.rs`](tests/perf_regression.rs) for performance regression probes and [`tests/fixtures/perf_baseline_ci.json`](tests/fixtures/perf_baseline_ci.json) for baseline format.
