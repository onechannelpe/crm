# CRM data pipeline

This app is the only production pipeline implementation.

## Scope

- Source validation on capped slices.
- Manual triage workflow support.
- Deterministic normalization and ingestion into SQLite.

## Principles

- Human-in-the-loop: no automatic semantic fixes.
- Streaming only: never load full source files into memory.
- Reproducible runs: manifest-driven inputs and persisted artifacts.

## Layout

- `data/mappings/`: source manifest and source mappings.
- `data/pipeline/runs/`: frozen outputs for each validation run.
- `data/pipeline/triage/`: manual triage files and run-diff reports.
- `../engine/data/raw/`: current raw source files.

## Commands

Run from repository root:

```bash
make -C apps/pipeline validate-slice ROW_CAP=10000
make -C apps/pipeline capture-run RUN_ID=baseline-2026-02-25
make -C apps/pipeline generate-triage RUN_ID=baseline-2026-02-25
make -C apps/pipeline compare-runs BASE_RUN=baseline-2026-02-25 CANDIDATE_RUN=candidate-2026-02-26
```

## Promotion rule

Full ingestion is allowed only after manual triage sign-off.
