# The engine

The engine is the HTTP runtime for contact search and record workflows. It reads
the published contacts database in read-only mode, owns a small writable leads
database, validates both schemas at startup, and serves signed API requests.

Startup begins in [`src/main.rs`](src/main.rs) and immediately delegates to
[`src/runtime.rs`](src/runtime.rs). Runtime setup loads the repo root `.env`,
parses [`src/config.rs`](src/config.rs), verifies that the contacts database
exists, opens SQLite pools, validates the `search` and `leads` schemas,
constructs service state, mounts the routers from the domain crates, and starts
the Axum listener.

## Architecture

This crate owns runtime assembly, configuration, health checks, observability,
and benchmark support. Search behavior lives in the `search` crate. Record
candidate and import behavior lives in the `leads` crate. Shared HMAC, rate
limit, error, and SQLite helpers live in the `shared` crate.

The source layout is intentionally small. [`src/runtime.rs`](src/runtime.rs)
wires the process. [`src/config.rs`](src/config.rs) validates environment
configuration. [`src/health.rs`](src/health.rs) probes the published contacts
database and exposes build metadata. [`src/benchmark/`](src/benchmark/) contains
benchmark contracts and comparison logic, while
[`src/bin/bench_search/`](src/bin/bench_search/) is the benchmark CLI.

## Dataset dependency

The contacts database is produced by `the pipeline` and defaults to
`crates/engine/data/contacts.sqlite`. The engine reads this database in place
through a read-only pool. After the pipeline promotes a new full database,
restart the engine process so new connections read the promoted file.

For local development, a sample contacts database is usually enough:

```sh
bun run pipeline:refresh
```

For a full production-size rebuild, use the full rebuild flow documented in
[`../pipeline/readme.md`](../pipeline/readme.md). Do not use `pipeline:refresh`
when the goal is to regenerate the full `contacts.sqlite`.

## HTTP API

The mounted endpoints are:

```http
GET  /health
POST /search
POST /records/candidates
POST /records/imports
```

Every `POST` endpoint requires `x-key-id`, `x-timestamp`, and `x-signature`. The
signature is `hex(hmac_sha256(timestamp_be_u64 + raw_body, secret))`. Requests
that pass HMAC verification are then charged against endpoint-specific rate
limit keys.

`POST /search` accepts:

```json
{
  "intent": "people | companies | mixed",
  "query": "string",
  "limit": 20
}
```

`limit` defaults to `20`, is clamped to at least `1`, and is capped by
`ENGINE_MAX_LIMIT`.

`POST /records/candidates` accepts:

```json
{
  "branch_id": 1,
  "user_id": 10,
  "amount": 25,
  "team_id": null,
  "product_id": null,
  "strategy": "balanced"
}
```

`strategy` can be `balanced`, `freshness`, or `conversion`. The response
contains normalized candidate rows with `ruc`, `organization_name`, `dni`,
`person_name`, and `phone_primary`.

`POST /records/imports` accepts:

```json
{
  "source": "manual-import",
  "rows": [
    {
      "ruc": "20100000001",
      "organization_name": "Example SAC",
      "dni": "10000001",
      "person_name": "Example Person",
      "phone_primary": "999100001",
      "quality_tier": 1,
      "product_tag": "loan",
      "branch_tag": 10
    }
  ]
}
```

The import endpoint has a 10 MB request body cap and reports inserted, updated,
skipped, and total row counts.

## Configuration

Configuration is loaded from the repo root `.env`. `ENGINE_HMAC_KEYS_JSON` is
required and must be a JSON object such as `{"web":"secret"}`.

Defaults:

```text
ENGINE_CONNECT_MODE=local
ENGINE_CONTACTS_DB_PATH=crates/engine/data/contacts.sqlite
ENGINE_LEADS_DB_PATH=crates/engine/data/leads.sqlite
ENGINE_HOST=127.0.0.1
ENGINE_PORT=3001
ENGINE_HMAC_MAX_SKEW_SECS=60
ENGINE_RATE_LIMIT_PER_KEY=600
ENGINE_MAX_LIMIT=100
```

In local mode, `ENGINE_HOST` must bind to loopback. Use
`ENGINE_CONNECT_MODE=internal` for a private container network. Use
`ENGINE_CONNECT_MODE=remote` when the service is intentionally exposed behind
public network infrastructure.

## Running

Build or refresh the contacts database before starting the server:

```sh
bun run pipeline:refresh
bun run dev:engine
```

For full database promotion, run the pipeline full rebuild and promotion first,
then restart the engine.

## Validation

```sh
bun run check:engine
bun run test:engine
```

`check:engine` runs the Rust workspace checks used for engine and pipeline
changes. `test:engine` runs the engine test target directly.

## Benchmarks

The benchmark binary is `bench-search` under
[`src/bin/bench_search/`](src/bin/bench_search/). The Criterion benchmark target
is [`benches/search_service.rs`](benches/search_service.rs), and its default
workload fixture is
[`benches/workloads/default.json`](benches/workloads/default.json).

Operational benchmark scripts live under [`../../ops/bench/`](../../ops/bench/).
Smoke benchmark runs can refresh a sample dataset. Full benchmark runs expect an
existing full dataset and do not build it.

## First reads

Start with [`src/runtime.rs`](src/runtime.rs), [`src/config.rs`](src/config.rs),
and [`src/health.rs`](src/health.rs). Then read the mounted API crates:
[`../search/src/api.rs`](../search/src/api.rs),
[`../search/src/service.rs`](../search/src/service.rs),
[`../leads/src/api.rs`](../leads/src/api.rs), and
[`../leads/src/service.rs`](../leads/src/service.rs).
