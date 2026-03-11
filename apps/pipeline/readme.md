# pipeline

The pipeline's job is to turn raw source files into a SQLite database the engine can serve. It never runs in production — it's a batch process you run when the source data changes. The output is a single file: `apps/engine/data/contacts.sqlite`.

## How the data flows

Source files come in, get normalized against [`contracts/source-contract.json`](../../contracts/source-contract.json) and [`contracts/canonical-contract.json`](../../contracts/canonical-contract.json), get merged and deduplicated across sources, and get materialized into the serving tables the engine queries. Nothing gets published until a quality gate passes — promote is a separate step that validates the staged build, stamps build metadata into it, and atomically swaps it into place. The previous snapshot is kept as `.prev`.

The execution path starts in [`src/pipeline.rs`](src/pipeline.rs), which loads config from [`pipeline.toml`](pipeline.toml), validates the source manifest, picks a profile (quick / standard / full), and dispatches to the right stage runner. The stage helper in [`src/stages/verify/helpers.rs`](src/stages/verify/helpers.rs) is where the actual work happens: shard ingest, merge, snapshot validation, serving-table materialization, and checkpoint writes. The quality gate lives in [`src/stages/gate.rs`](src/stages/gate.rs) and promote in [`src/stages/promote.rs`](src/stages/promote.rs).

Profiles control sample size and which checks run. `quick` is fast enough to iterate on normalization logic. `standard` is what CI uses. `full` is the production build — don't run it locally unless you need the final artifact.

## Output paths

| Path | What's there |
|---|---|
| `data/normalized/` | Normalized diagnostics per source |
| `data/build/bench/` | Sample and benchmark outputs |
| `data/build/staged/` | Staged SQLite ready for promotion |
| `../engine/data/contacts.sqlite` | Live engine dataset |
| `../engine/data/contacts.sqlite.prev` | Previous snapshot |

## Commands

For local development, `refresh` is the command you'll use — it runs a sample build and publishes it directly:

```sh
bun run pipeline:refresh        # 100k sample
bun run pipeline:refresh:10k    # faster, 10k sample
```

Before a longer run, check that manifests and contracts are clean:

```sh
bun run pipeline:verify-manifest
```

To validate normalization without publishing anything:

```sh
bun run pipeline:engine validate --profile quick
bun run pipeline:engine validate --profile standard
```

Full build and promote (production):

```sh
bun run pipeline:engine build --profile full
bun run pipeline:engine promote
```

Full command reference for `bun run pipeline:engine -- <command>`:

| Command | Purpose |
|---|---|
| `refresh --slice 10k\|100k\|100k-osiptel` | Sample build + publish |
| `verify-manifest` | Validate manifests and contracts |
| `validate --profile quick\|standard` | Normalize and check without publishing |
| `bench --profile quick\|standard\|heavy` | Benchmark query performance |
| `build --profile full` | Build the full dataset |
| `promote [--from <path>] [--to <path>]` | Run quality gate and publish |
