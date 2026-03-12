# The pipeline

Reads source files, validates them against shared contracts, writes normalized and staged artifacts, and publishes the SQLite dataset consumed by the engine.

Command parsing starts in [`src/cli.rs`](src/cli.rs). The binary entrypoint is [`src/main.rs`](src/main.rs). Orchestration is in [`src/pipeline.rs`](src/pipeline.rs). Runtime paths and profile resolution are in [`src/config/runtime.rs`](src/config/runtime.rs) and [`pipeline.toml`](pipeline.toml).

The main execution path in [`src/pipeline.rs`](src/pipeline.rs) loads the runtime config, validates the source manifest and contracts, resolves a profile, and dispatches to a stage runner. Sample and full verification flows live in [`src/stages/verify/run_sample.rs`](src/stages/verify/run_sample.rs) and [`src/stages/verify/run_full.rs`](src/stages/verify/run_full.rs). The stage helper layer in [`src/stages/verify/helpers.rs`](src/stages/verify/helpers.rs) runs enabled sources through shard ingest, merge, snapshot validation, serving-table materialization, quick checks, and checkpoint and timing writes.

`refresh` is a sample build followed by publish. `promote` runs the quality gate in [`src/stages/gate.rs`](src/stages/gate.rs), stamps `_pipeline_build` metadata into the staged database, and atomically replaces the target database through [`src/stages/promote.rs`](src/stages/promote.rs). The previous published database is kept as `.prev`.

Configuration and input definitions are in [`pipeline.toml`](pipeline.toml), [`data/mappings/source-manifest.json`](data/mappings/source-manifest.json), [`canonical-contract.json (contracts)`](../../contracts/canonical-contract.json), [`source-contract.json (contracts)`](../../contracts/source-contract.json), and [`search-projection.json (contracts)`](../../contracts/search-projection.json).

## Commands

Common commands:

```sh
bun run pipeline:refresh
bun run pipeline:refresh:10k
bun run pipeline:verify-manifest
bun run pipeline:engine validate --profile quick
bun run pipeline:engine validate --profile standard
bun run pipeline:engine build --profile full
bun run pipeline:engine promote
```

Command reference for `bun run pipeline:engine -- <command>`:

- `refresh --slice 10k|100k|100k-osiptel [--to <path>]`
- `verify-manifest`
- `validate --profile quick|standard`
- `bench --profile quick|standard|heavy`
- `bench-map --profile quick|standard|heavy`
- `build --profile full`
- `promote [--from <path>] [--to <path>]`

## Outputs

Output paths are `data/normalized/` for normalized diagnostics, `data/build/bench/` for sample and benchmark outputs, `data/build/staged/` for staged SQLite files, and [`contacts.sqlite (engine)`](../engine/data/contacts.sqlite) for the published engine dataset.

## First reads

Start with [`src/pipeline.rs`](src/pipeline.rs) and [`src/cli.rs`](src/cli.rs). Then read [`src/stages/verify/helpers.rs`](src/stages/verify/helpers.rs), [`src/stages/shard_ingest/run.rs`](src/stages/shard_ingest/run.rs), [`src/stages/merge/session.rs`](src/stages/merge/session.rs), [`src/stages/materialize.rs`](src/stages/materialize.rs), and [`src/db/schema.rs`](src/db/schema.rs).
