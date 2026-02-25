# processing

Rust pipeline that consolidates raw contact data from multiple sources into the engine's SQLite database. See [root readme](../../readme.md) for project overview.

## Data sources

Configured in [`data/mappings/source-manifest.json`](data/mappings/source-manifest.json). Each entry specifies a raw file path, field mapping, reliability rank, and ingestion priority. Raw files live in `../engine/data/raw/` and are not committed.

Per-source field mappings are in `data/mappings/sources/`. Canonical field names: [`data/mappings/canonical-fields.json`](data/mappings/canonical-fields.json).

```sh
bun run pipeline:verify-manifest   # verify all raw paths resolve
```

## Validation workflow

Use when inspecting normalization quality or comparing outputs across changes.

```sh
# Normalize a sample slice; outputs to data/normalized/
make -C apps/pipeline validate-slice ROW_CAP=10000

# Freeze output as a named run
make -C apps/pipeline capture-run RUN_ID=baseline-2026-02-25

# Generate a triage template
make -C apps/pipeline generate-triage RUN_ID=baseline-2026-02-25

# Diff two runs
make -C apps/pipeline compare-runs BASE_RUN=baseline-2026-02-25 CANDIDATE_RUN=candidate-2026-02-26
```

Triage files and diffs are written to `data/pipeline/triage/`.

## Full build

Ingests all enabled sources, materializes the serving layer, and atomically promotes the result to `apps/engine/data/contacts.sqlite`. Engine restart required to pick up the new file.

```sh
bun run pipeline:staged-test
```

## Layout

- `data/mappings/`: source manifest and per-source field mappings
- `data/normalized/`: normalize-matrix output (not committed)
- `data/pipeline/runs/`: frozen outputs for each validation run
- `data/pipeline/triage/`: triage files and run-diff reports
- `../engine/data/raw/`: raw source files (not committed)
