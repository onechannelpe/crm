# The pipeline

`The pipeline` builds the SQLite contact dataset consumed by the engine. It
reads raw source files, validates mappings and contracts, normalizes source
rows, merges accepted records into a staged database, materializes serving
tables, and publishes the final database only after the quality gate passes.

The binary entrypoint is [`src/main.rs`](src/main.rs). CLI parsing is in
[`src/cli.rs`](src/cli.rs), and top-level command dispatch is in
[`src/pipeline.rs`](src/pipeline.rs). Runtime paths and profiles are loaded from
[`pipeline.toml`](pipeline.toml) through
[`src/config/runtime.rs`](src/config/runtime.rs).

## Architecture

Configuration and manifest handling live under [`src/config/`](src/config/).
Source row normalization lives under [`src/normalize/`](src/normalize/). Sharded
CSV ingestion is owned by [`src/ingest/`](src/ingest/), while durable merge
logic and merge SQL live under [`src/merge/`](src/merge/). SQLite connection
helpers and schema creation are under [`src/storage/`](src/storage/).

Run orchestration is isolated under [`src/run/`](src/run/). The full run mode is
implemented in [`src/run/full.rs`](src/run/full.rs), sample and benchmark runs
in [`src/run/matrix.rs`](src/run/matrix.rs), and shared ingest, merge,
validation, materialization, and timing work in
[`src/run/phase.rs`](src/run/phase.rs). Serving-table creation is in
[`src/materialize.rs`](src/materialize.rs), snapshot checks are in
[`src/validate.rs`](src/validate.rs), promotion checks are in
[`src/gate.rs`](src/gate.rs), and atomic database replacement is in
[`src/promote.rs`](src/promote.rs).

## Runtime flow

Every command starts by loading runtime configuration and validating the source
manifest and generated contracts when the command depends on source data.
Profiles come from [`pipeline.toml`](pipeline.toml). Sample profiles add row
caps and write their intermediate files under `data/build/bench/`. The full
profile processes the enabled manifest sources without row caps.

A build run initializes a fresh staged SQLite database, loads enabled sources in
priority order, ingests each source into worker shard databases, merges those
shards into the staged database, validates the resulting snapshot, and records
per-source checkpoints and timing metadata. After all sources finish, the run
materializes the engine-facing projection tables and runs quick existence
checks.

Promotion is intentionally separate from full build. `promote` runs the quality
gate against the staged database, writes `_pipeline_build` metadata, copies the
database through `VACUUM INTO`, atomically replaces the engine database, and
keeps the previous published database as `.prev`.

## Configuration

The default runtime config is [`pipeline.toml`](pipeline.toml). Important paths:

```toml
[paths]
manifest = "crates/pipeline/data/mappings/source-manifest.json"
staged_db = "crates/pipeline/data/build/staged/contacts.pipeline.staged.sqlite"
bench_dir = "crates/pipeline/data/build/bench"
engine_db = "crates/engine/data/contacts.sqlite"
```

Source definitions are in
[`data/mappings/source-manifest.json`](data/mappings/source-manifest.json).
Mappings are in [`data/mappings/sources/`](data/mappings/sources/), and raw
files are expected under [`data/raw/`](data/raw/). Contract validation uses the
canonical and engine projection contracts under
[`../../contracts/`](../../contracts/).

## Commands

The package script entrypoint is:

```sh
bun run pipeline:engine <command>
```

The same commands can be run directly with Cargo:

```sh
cargo run -p pipeline -- <command>
```

Use `--release` for long or production-scale runs.

Common commands:

```sh
bun run pipeline:verify-manifest
bun run pipeline:refresh:10k
bun run pipeline:refresh:100k
bun run pipeline:engine validate --profile quick
bun run pipeline:engine validate --profile standard
cargo run -p pipeline --release -- build --profile full
cargo run -p pipeline --release -- promote
```

Command reference:

```text
verify-manifest
validate --profile quick|standard
bench --profile quick|standard|heavy
bench-map --profile quick|standard|heavy
refresh --slice 10k|100k|100k-osiptel [--to <path>]
build --profile full
promote [--from <path>] [--to <path>]
```

`refresh` is a sample build followed by publish. It is useful for local engine
development, but it does not create the production-size database.

## Full rebuild

The full contact database is a long-running operation. Run it in a supervised
environment such as `tmux`, systemd, CI, or a persistent server shell with log
capture.

Recommended sequence:

```sh
make -C crates/pipeline verify
make -C crates/pipeline build-full
make -C crates/pipeline promote
```

`build-full` writes
`crates/pipeline/data/build/staged/contacts.pipeline.staged.sqlite`. It does not
replace the engine database. Inspect the build output and staged database before
promotion. `promote` publishes to `crates/engine/data/contacts.sqlite` after the
quality gate passes.

The direct equivalent is:

```sh
cargo run --release --manifest-path crates/pipeline/Cargo.toml -- verify-manifest
cargo run --release --manifest-path crates/pipeline/Cargo.toml -- build --profile full
cargo run --release --manifest-path crates/pipeline/Cargo.toml -- promote
```

## Outputs

Normalized diagnostics are written to `data/normalized/`. Sample and benchmark
databases and extracted sample CSVs are written under `data/build/bench/`. The
full staged database is written under `data/build/staged/`. Run metadata,
checkpoints, and timing files are written under a `runs/` directory next to the
target database.

The published engine database is
[`../engine/data/contacts.sqlite`](../engine/data/contacts.sqlite). Promotion
keeps the previous published database as `contacts.sqlite.prev`.

## First reads

Start with [`src/pipeline.rs`](src/pipeline.rs), [`src/cli.rs`](src/cli.rs), and
[`src/config/runtime.rs`](src/config/runtime.rs). For build behavior, read
[`src/run/full.rs`](src/run/full.rs), [`src/run/matrix.rs`](src/run/matrix.rs),
and [`src/run/phase.rs`](src/run/phase.rs). For data movement, read
[`src/ingest/mod.rs`](src/ingest/mod.rs),
[`src/merge/mod.rs`](src/merge/mod.rs),
[`src/materialize.rs`](src/materialize.rs), and
[`src/storage/schema.rs`](src/storage/schema.rs).
