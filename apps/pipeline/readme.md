# pipeline

A Rust pipeline that transforms raw contact sources into SQLite datasets consumed by [engine](../engine/readme.md).

## How it works

Pipeline execution follows a fixed lifecycle:

1. Verify manifest and contracts, then resolve runtime profile and output paths ([pipeline runner](src/pipeline.rs), [manifest verification](src/config/manifest.rs), [contract guard](src/contract_guard.rs)).
2. Ingest enabled sources in priority order; each source goes through shard ingest, merge, and snapshot validation ([sample flow](src/stages/verify/run_sample.rs), [full flow](src/stages/verify/run_full.rs), [ingest helpers](src/stages/verify/helpers.rs)).
3. Materialize serving tables and run quick existence checks for core tables and projection indexes ([verify helpers](src/stages/verify/helpers.rs), [materialization](src/stages/materialize.rs)).
4. For publish paths, run quality gates and stamp `_pipeline_build` metadata (`build_id`, `built_at`, `rows`) ([gate](src/stages/gate.rs), [publish flow](src/pipeline.rs)).
5. Promote atomically into engine DB using `VACUUM INTO`, backup old target as `.prev`, and swap files ([promotion](src/stages/promote.rs)).

Operational artifacts for debugging are written under the run directory (`metadata.json`, phase timings, checkpoints) by [run context](src/stages/bootstrap.rs).

## What it does

- Verifies source manifest and contracts before processing. See [pipeline runner](src/pipeline.rs) and [contract guard](src/contract_guard.rs).
- Produces sample/full datasets through stage orchestration. See [verify stages](src/stages/verify.rs) and [materialization](src/stages/materialize.rs).
- Publishes an engine-ready DB with quality gate checks, build metadata, and atomic replacement. See [gate](src/stages/gate.rs), [promotion](src/stages/promote.rs), and [publish flow](src/pipeline.rs).

## Primary workflows

**Refresh engine DB for development (recommended)**

```sh
bun run pipeline:refresh
```

Smaller/faster slice:

```sh
bun run pipeline:refresh:10k
```

**Validate normalization only (no publish)**

```sh
bun run pipeline:engine validate --profile quick
# or
bun run pipeline:engine validate --profile standard
```

**Full ingest and publish (production)**

```sh
bun run pipeline:engine build --profile full
bun run pipeline:engine promote
```

## Inputs, contracts, and runtime config

- Source manifest and raw-file paths: [apps/pipeline/data/mappings/source-manifest.json](data/mappings/source-manifest.json)
- Runtime profiles and output paths: [apps/pipeline/pipeline.toml](pipeline.toml)
- Canonical contract: [contracts/canonical-contract.json](../../contracts/canonical-contract.json)
- Source contract: [contracts/source-contract.json](../../contracts/source-contract.json)
- Search projection contract: [contracts/search-projection.json](../../contracts/search-projection.json)

Validate manifest + contracts before running heavy workflows:

```sh
bun run pipeline:verify-manifest
```

## Output artifacts and guarantees

- Sample/benchmark outputs: [apps/pipeline/data/build/bench/](data/build/bench/)
- Full staged output: [apps/pipeline/data/build/staged/](data/build/staged/)
- Engine publish target: [apps/engine/data/contacts.sqlite](../engine/data/contacts.sqlite)
- Normalized diagnostics: [apps/pipeline/data/normalized/](data/normalized/)

`refresh`/`promote` guarantees when successful:

- quality gate passed,
- `_pipeline_build` metadata stamped (`build_id`, `built_at`, `rows`),
- atomic publish with previous DB backup (`.prev`) handled by promotion path.

## CLI command map

Entrypoint: `bun run pipeline:engine -- <command>` ([CLI parser](src/cli.rs))

- `refresh --slice 10k|100k|100k-osiptel [--to <path>]`
- `verify-manifest`
- `validate --profile quick|standard`
- `bench --profile quick|standard|heavy`
- `bench-map --profile quick|standard|heavy`
- `build --profile full`
- `promote [--from <path>] [--to <path>]`
