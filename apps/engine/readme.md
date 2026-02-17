# engine

Rust + Axum search API backed by a read-only SQLite snapshot.

## quick start

from repo root:

```sh
bun run dev:engine
```

## data pipeline

1) build SQLite snapshot used by engine from consolidated CSV (`apps/engine/data/contacts.csv`):

```sh
bun run build:engine:sqlite
```

default output database: `apps/engine/data/contacts.sqlite`

## API

endpoints:

```txt
GET  /v1/health
POST /v1/search
```

`POST /v1/search` headers:

- `x-timestamp`: unix seconds
- `x-signature`: `hex(hmac_sha256(timestamp_be_u64 + raw_body, ENGINE_HMAC_SECRET))`

request body:

```json
{
  "type": "dni | ruc | phone | person_name | company_name | phone_enriched",
  "value": "string",
  "limit": 20
}
```

## config

read from root `.env`:

- `ENGINE_HMAC_SECRET` (required)
- `ENGINE_HOST` (default `127.0.0.1`)
- `ENGINE_PORT` (default `3001`)
- `ENGINE_DB_PATH` (default `apps/engine/data/contacts.sqlite`)
- `ENGINE_RATE_LIMIT_PER_IP` (default `120`)
- `ENGINE_SEARCH_TIMEOUT_MS` (reserved)
- `ENGINE_MAX_LIMIT` (default `100`)

## testing

run unit/integration tests:

```sh
mise x -- cargo test --manifest-path apps/engine/Cargo.toml
```

run performance probe (ignored test):

```sh
ENGINE_DB_PATH=apps/engine/data/contacts.sqlite \
ENGINE_WORKLOAD_PATH=apps/engine/data/sqlite_workload.json \
ENGINE_WORKLOAD_ITERATIONS=5000 \
mise x -- cargo test --manifest-path apps/engine/Cargo.toml --test perf_regression perf_regression_probe -- --ignored --nocapture
```

output includes a machine-readable line:

```txt
PERF_METRICS_JSON {...}
```

optional regression gate:

- set `ENGINE_PERF_BASELINE_JSON` to previous metrics JSON
- set `ENGINE_PERF_REGRESSION_FACTOR` (default `1.20`)
- sample baseline artifact: `apps/engine/data/perf_baseline.sample.json`

memory measurement example:

```sh
/usr/bin/time -v mise x -- cargo test --manifest-path apps/engine/Cargo.toml --test perf_regression perf_regression_probe -- --ignored --nocapture
```
