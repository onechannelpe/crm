# Engine benchmark operations

This folder contains system benchmark operations for the engine search path.

## Standards

- Benchmark root on runner: `/srv/crm/bench`
- Dataset manifests in `/srv/crm/bench/manifests`
- Run outputs in `/srv/crm/bench/runs`
- Baselines tracked in git at `ops/bench/baselines`

## Scripts

- `build_smoke_dataset.sh`: rebuild smoke dataset using pipeline `refresh --slice 100k`.
- `update_full_manifest.sh`: refresh manifest metadata for full dataset.
- `run_benchmark.sh`: run `bench-search` for smoke or full mode.
- `promote_baseline.sh`: atomically replace baseline JSON.
- `update_manifest.py`: generate manifest with contract and workload hashes.

## Typical flow

1. Refresh smoke dataset manifest:

```bash
bash ops/bench/build_smoke_dataset.sh
```

2. Run smoke benchmark:

```bash
bash ops/bench/run_benchmark.sh
```

3. Promote baseline (after review):

```bash
bash ops/bench/promote_baseline.sh /srv/crm/bench/runs/smoke-<run-id>.json ops/bench/baselines/smoke.json
```
