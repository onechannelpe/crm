# Pipeline processing

Rust pipeline for consolidating raw contact sources into a staged SQLite database and promoting it to engine.

## Tooling prerequisites

- `bun`
- `cargo`
- `uv`

## Data setup after clone

Raw files are not committed. Copy files from the shared folder into `apps/pipeline/data/raw/` with the exact names referenced by `apps/pipeline/data/mappings/source-manifest.json`.

Required raw files:
- `celulares.txt`
- `CLARO_POST_202508.txt`
- `Consolidado_RUC20_Representantes_MERGED.tsv`
- `Representantes_ENRIQUECIDO.txt`
- `osiptel_2025.csv`
- `BITEL_POST_MS.txt`
- `MOVISTAR_POST_202508.txt`
- `Mov_MeSal.txt`
- `PadronRUC_202601.csv`
- `Consolidado_RUC20_Representantes_BPPO.txt`

Verify paths and mappings:

```sh
make -C apps/pipeline verify
```

## Runtime configuration

Pipeline runtime behavior is defined in `apps/pipeline/pipeline.toml`.

- `paths`: manifest/db/output locations
- `profiles.quick`: small sample validation
- `profiles.standard`: default benchmark profile
- `profiles.heavy`: sample benchmark including osiptel
- `profiles.full`: full ingest build profile

Use profiles instead of long CLI argument lists.

## Main workflows

Validation (normalization quality):

```sh
make -C apps/pipeline validate-quick
# or
make -C apps/pipeline validate-standard
```

Benchmark (sample ingest + materialization):

```sh
make -C apps/pipeline bench-standard
# optional heavier sample including osiptel
make -C apps/pipeline bench-heavy
```

Full build (enabled sources, full files):

```sh
make -C apps/pipeline build-full
```

Promote staged DB to engine:

```sh
make -C apps/pipeline promote
```

## Quality gates

Run before proposing changes:

```sh
bun run check
cargo fmt --manifest-path apps/pipeline/Cargo.toml
cargo test --manifest-path apps/pipeline/Cargo.toml
cargo clippy --manifest-path apps/pipeline/Cargo.toml --all-targets -- -D warnings
```

## Validation artifacts

Slice and triage artifacts:

```sh
make -C apps/pipeline capture-run RUN_ID=baseline
make -C apps/pipeline generate-triage RUN_ID=baseline
make -C apps/pipeline compare-runs BASE_RUN=baseline CANDIDATE_RUN=candidate
```

Output locations:
- `apps/pipeline/data/normalized/`
- `apps/pipeline/data/pipeline/runs/`
- `apps/pipeline/data/pipeline/triage/`

## Current baseline reference (2026-02-26)

Profile `standard` (`bench-standard`):
- 100k sample benchmark (no osiptel): approximately 46s to 61s depending on cache/warmness

Profile `heavy` (`bench-heavy`):
- 100k sample benchmark including osiptel: approximately 61s on warm runs

## Layout

- `src/cli.rs`: profile-oriented CLI commands
- `src/config/runtime.rs`: `pipeline.toml` parsing and profile resolution
- `src/stages/verify.rs`: sample/full orchestration
- `src/stages/consolidate.rs`: streaming ingest into normalized core tables
- `src/stages/materialize.rs`: serving-layer table build and indexes
- `data/mappings/`: source manifest and source mappings
- `data/raw/`: source files (not committed)
- `data/build/`: staged and benchmark outputs
