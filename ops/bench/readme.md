# Engine benchmark operations

This folder contains system benchmark operations for the engine search path.

## Standards

- Benchmark root on runner: `/srv/crm/bench`
- Dataset manifests in `/srv/crm/bench/manifests`
- Run outputs in `/srv/crm/bench/runs`
- Baselines persisted on runner at `/srv/crm/bench/baselines`

## Scripts

- `build_smoke_dataset.sh`: rebuild smoke dataset using pipeline `refresh --slice 100k`.
- `prepare_pipeline_runtime.py`: generate server-native pipeline config and manifest pointing to `/srv/crm/raw` and fail fast on missing raw files.
- `generate_workload_from_db.py`: derive workload inputs from the built dataset.
- `update_full_manifest.sh`: refresh manifest metadata for full dataset.
- `run_benchmark.sh`: run `bench-search` for smoke or full mode.
- `promote_baseline.sh`: atomically replace baseline JSON.
- `update_manifest.py`: generate manifest with contract and workload hashes.

## Typical flow

1. Trigger one workflow in GitHub Actions: `bench search`.

Use these inputs for typical cases:
- Bootstrap smoke baseline: `mode=smoke`, `refresh_dataset=true`, `promote_baseline=true`, `run_strict_gate=true`.
- Smoke gate only: `mode=smoke`, `refresh_dataset=true`, `promote_baseline=false`, `run_strict_gate=true`.
- Full gate only: `mode=full`, `refresh_dataset=true`, `promote_baseline=false`, `run_strict_gate=true`.
