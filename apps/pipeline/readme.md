# Pipeline processing

Rust pipeline that consolidates raw contact data into a staged SQLite, then produces engine serving tables.

## Data setup after clone

Raw files are not committed. Copy them from the shared folder into `apps/pipeline/data/raw/` with the exact filenames expected by [`data/mappings/source-manifest.json`](data/mappings/source-manifest.json).

Expected raw paths:
- `apps/pipeline/data/raw/celulares.txt`
- `apps/pipeline/data/raw/CLARO_POST_202508.txt`
- `apps/pipeline/data/raw/Consolidado_RUC20_Representantes_MERGED.tsv`
- `apps/pipeline/data/raw/Representantes_ENRIQUECIDO.txt`
- `apps/pipeline/data/raw/osiptel_2025.csv`
- `apps/pipeline/data/raw/BITEL_POST_MS.txt`
- `apps/pipeline/data/raw/MOVISTAR_POST_202508.txt`
- `apps/pipeline/data/raw/Mov_MeSal.txt`
- `apps/pipeline/data/raw/PadronRUC_202601.csv`
- `apps/pipeline/data/raw/Consolidado_RUC20_Representantes_BPPO.txt`

Validate manifest/raw resolution:

```sh
bun run pipeline:verify-manifest
```

Per-source field mappings are in `data/mappings/sources/`. Canonical fields are defined in [`data/mappings/canonical-fields.json`](data/mappings/canonical-fields.json).

## Checks and tests

Run these before and after pipeline changes:

```sh
# repo checks (contract/web/engine/lint/format/clippy)
bun run check

# pipeline crate checks (not covered by bun run check)
cargo fmt --manifest-path apps/pipeline/Cargo.toml
cargo test --manifest-path apps/pipeline/Cargo.toml
cargo clippy --manifest-path apps/pipeline/Cargo.toml --all-targets -- -D warnings
```

## Validation workflow

Use this when reviewing normalization quality and triaging bad rows.

```sh
# normalize slice per enabled source; writes to apps/pipeline/data/normalized
make -C apps/pipeline validate-slice ROW_CAP=10000

# snapshot normalized output for comparison
make -C apps/pipeline capture-run RUN_ID=baseline-2026-02-26

# generate triage template
make -C apps/pipeline generate-triage RUN_ID=baseline-2026-02-26

# compare two runs
make -C apps/pipeline compare-runs BASE_RUN=baseline-2026-02-26 CANDIDATE_RUN=candidate-2026-02-27
```

Outputs:
- `apps/pipeline/data/normalized/`: per-source normalized rows and errors
- `apps/pipeline/data/pipeline/runs/`: frozen run snapshots
- `apps/pipeline/data/pipeline/triage/`: triage files and run-diff reports

## Benchmark workflow

Use `run-matrix` with explicit output paths so benchmarks are reproducible.

```sh
# 100k slice benchmark (without osiptel sample)
cargo run --manifest-path apps/pipeline/Cargo.toml -- run-matrix \
  --db apps/pipeline/data/build/bench/bench-100k.sqlite \
  --build-dir apps/pipeline/data/build/bench/bench-100k \
  --manifest apps/pipeline/data/mappings/source-manifest.json \
  --row-cap-a 100000 \
  --row-cap-b 100000 \
  --run-osiptel-sample 0 \
  --batch-size 50000

# 100k slice benchmark including osiptel sample
cargo run --manifest-path apps/pipeline/Cargo.toml -- run-matrix \
  --db apps/pipeline/data/build/bench/bench-100k-with-osiptel.sqlite \
  --build-dir apps/pipeline/data/build/bench/bench-100k-with-osiptel \
  --manifest apps/pipeline/data/mappings/source-manifest.json \
  --row-cap-a 100000 \
  --row-cap-b 100000 \
  --run-osiptel-sample 1 \
  --osiptel-row-cap 100000 \
  --batch-size 50000
```

Notes:
- `run-matrix` recreates the target `--db` file.
- Keep benchmark outputs under `apps/pipeline/data/build/bench/`.
- Compare elapsed wall time and validate output counts in `snapshot_metrics`.

### Current baseline (2026-02-26)

Hardware/filesystem affect absolute time. Use this as directional reference:

- 100k slice, no osiptel, `batch-size=50000`: about `46s` to `61s` depending on cache/warmness.
- 100k slice with osiptel sample, `batch-size=50000`: about `61s` on warm runs.
- Proven improvements applied:
- Transaction-scoped ingest statement reuse.
- Deferred non-essential index build from schema init to materialization.
- `run-matrix` batch size control with default `50000`.

## Full build and promote

Build staged DB and materialized serving tables:

```sh
bun run pipeline:staged-test
```

Promote staged DB to engine DB:

```sh
cargo run --manifest-path apps/pipeline/Cargo.toml -- promote-db \
  --from apps/pipeline/data/build/staged/contacts.pipeline.staged.sqlite \
  --to apps/engine/data/contacts.sqlite
```

Engine must restart to pick up `apps/engine/data/contacts.sqlite`.

## Layout

- `src/main.rs`: process entrypoint
- `src/cli.rs`: CLI arg parsing and defaults
- `src/pipeline.rs`: command dispatch
- `src/config/`: manifest, mapping, and path config
- `src/db/`: schema and repository operations
- `src/domain/`: normalization and canonical mapping logic
- `src/stages/`: consolidate, normalize, validate, verify, materialize
- `data/mappings/`: source manifest and per-source mappings
- `data/raw/`: raw source inputs (not committed)
- `data/normalized/`: normalization outputs (not committed)
- `data/pipeline/runs/`: captured run outputs
- `data/pipeline/triage/`: triage and comparison artifacts
