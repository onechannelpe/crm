# pipeline

## layout

- `data/mappings/`: source manifest and source mappings.
- `data/pipeline/runs/`: frozen outputs for each validation run.
- `data/pipeline/triage/`: manual triage files and run-diff reports.
- `../engine/data/raw/`: current raw source files.

## commands

Run from repository root:

```bash
make -C apps/pipeline validate-slice ROW_CAP=10000
make -C apps/pipeline capture-run RUN_ID=baseline-2026-02-25
make -C apps/pipeline generate-triage RUN_ID=baseline-2026-02-25
make -C apps/pipeline compare-runs BASE_RUN=baseline-2026-02-25 CANDIDATE_RUN=candidate-2026-02-26
```
