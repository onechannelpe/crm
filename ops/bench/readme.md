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
- Bootstrap smoke baseline: `mode=smoke`, `operation=bootstrap`, `refresh_dataset=true`.
- Smoke gate only: `mode=smoke`, `operation=gate`, `refresh_dataset=true`.
- Bootstrap full baseline: `mode=full`, `operation=bootstrap`, `refresh_dataset=true`.
- Full gate only: `mode=full`, `operation=gate`, `refresh_dataset=true`.

`bench search` is linear by design:
- Build binaries once.
- Optionally refresh dataset state.
- Run one benchmark phase (`bootstrap` or `gate`).
- Optionally promote baseline (`bootstrap` only).
