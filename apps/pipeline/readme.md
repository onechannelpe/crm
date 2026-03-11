# pipeline

A Rust pipeline that reads source files, writes normalized and staged artifacts, and publishes the SQLite dataset consumed by [../engine/](../engine/).

Command parsing starts in [`src/cli.rs`](src/cli.rs). The binary entrypoint is [`src/main.rs`](src/main.rs). Orchestration is in [`src/pipeline.rs`](src/pipeline.rs). Runtime paths and profile resolution are in [`src/config/runtime.rs`](src/config/runtime.rs) and [`pipeline.toml`](pipeline.toml).

Refresh the engine dataset for local development:

```sh
bun run pipeline:refresh
```

Use a smaller sample dataset:

```sh
bun run pipeline:refresh:10k
```

Validate normalization without publishing:

```sh
bun run pipeline:engine validate --profile quick
bun run pipeline:engine validate --profile standard
```

Build and promote the full dataset:

```sh
bun run pipeline:engine build --profile full
bun run pipeline:engine promote
```

The main execution path in [`src/pipeline.rs`](src/pipeline.rs) loads the runtime config, validates the source manifest and contracts, resolves a profile, and dispatches to one of the stage runners. Sample and full verification flows live in [`src/stages/verify/run_sample.rs`](src/stages/verify/run_sample.rs) and [`src/stages/verify/run_full.rs`](src/stages/verify/run_full.rs). The stage helper layer in [`src/stages/verify/helpers.rs`](src/stages/verify/helpers.rs) runs enabled sources through shard ingest, merge, snapshot validation, serving-table materialization, quick checks, and checkpoint/timing writes.

Configuration and input definitions are in [`pipeline.toml`](pipeline.toml), [`data/mappings/source-manifest.json`](data/mappings/source-manifest.json), [`../../contracts/canonical-contract.json`](../../contracts/canonical-contract.json), [`../../contracts/source-contract.json`](../../contracts/source-contract.json), and [`../../contracts/search-projection.json`](../../contracts/search-projection.json).

Check manifests and contracts before longer runs:

```sh
bun run pipeline:verify-manifest
```

`refresh` is a sample build followed by publish. `promote` runs the quality gate in [`src/stages/gate.rs`](src/stages/gate.rs), stamps `_pipeline_build` metadata into the staged database, and atomically replaces the target database through [`src/stages/promote.rs`](src/stages/promote.rs). Output paths are `data/build/bench/` for sample and benchmark outputs, `data/build/staged/` for staged SQLite files, `data/normalized/` for normalized diagnostics, and [`../engine/data/contacts.sqlite`](../engine/data/contacts.sqlite) for the published engine dataset. The previous published DB is kept as `.prev`.

CLI command map for `bun run pipeline:engine -- <command>`:

- `refresh --slice 10k|100k|100k-osiptel [--to <path>]`
- `verify-manifest`
- `validate --profile quick|standard`
- `bench --profile quick|standard|heavy`
- `bench-map --profile quick|standard|heavy`
- `build --profile full`
- `promote [--from <path>] [--to <path>]`

A practical first read order is [`src/pipeline.rs`](src/pipeline.rs), [`src/cli.rs`](src/cli.rs), [`src/stages/verify/helpers.rs`](src/stages/verify/helpers.rs), [`src/stages/shard_ingest/run.rs`](src/stages/shard_ingest/run.rs), [`src/stages/merge/session.rs`](src/stages/merge/session.rs), [`src/stages/materialize.rs`](src/stages/materialize.rs), and [`src/db/schema.rs`](src/db/schema.rs).
