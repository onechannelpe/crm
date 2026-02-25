# engine

Rust/Axum contact search API backed by read-only SQLite. See [root readme](../../readme.md) for project overview.

## Quick start

From repo root:

```sh
bun run dev:engine
```

## Data pipeline

Engine reads from `apps/engine/data/contacts.sqlite`, a read-only SQLite snapshot. Rebuilt from consolidated CSV via [`scripts/build-engine-sqlite.py`](../../scripts/build-engine-sqlite.py). Swapping the file requires an engine restart.

```sh
bun run build:engine:sqlite
```

## API

```
GET  /v1/health
POST /v1/search
```

### POST /v1/search

HMAC-authenticated. See [`src/security/hmac.rs`](src/security/hmac.rs) for implementation.

| Header | Value |
|---|---|
| `x-timestamp` | Unix seconds |
| `x-signature` | `hex(hmac_sha256(timestamp_be_u64 + raw_body, ENGINE_HMAC_SECRET))` |

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

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ENGINE_HMAC_SECRET` | yes | | HMAC signing key |
| `ENGINE_PORT` | | `3001` | |
| `ENGINE_HOST` | | `127.0.0.1` | |
| `ENGINE_DB_PATH` | | `apps/engine/data/contacts.sqlite` | |
| `ENGINE_RATE_LIMIT_PER_IP` | | `120` | Requests per second per IP |
| `ENGINE_MAX_LIMIT` | | `100` | Max results per query |

## Testing

```sh
bun run test:engine
```

See [`tests/perf_regression.rs`](tests/perf_regression.rs) for performance regression probes and [`data/perf_baseline.sample.json`](data/perf_baseline.sample.json) for baseline format.
