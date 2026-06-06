# Bench

This directory contains the scripts used by the `bench search` workflow. The
workflow measures the engine search path against either a smoke dataset or an
already-built full dataset.

Benchmarks are not the owner of the full contact database build. The full
database is produced by `the pipeline` and promoted separately. See
[`../../crates/pipeline/readme.md`](../../crates/pipeline/readme.md) for the
full rebuild sequence.

## Runner layout

The benchmark runner uses `/srv/crm/bench` as its working root. Dataset
manifests are written to `/srv/crm/bench/manifests`, run reports to
`/srv/crm/bench/runs`, and persisted baselines to `/srv/crm/bench/baselines`.

Smoke datasets are stored under `/srv/crm/bench/datasets/smoke`. Full mode reads
`/srv/crm/full/contacts.sqlite` by default. If that full database is missing,
full mode fails instead of launching a pipeline build.

## Scripts

`build_smoke_dataset.sh` prepares a runner-local pipeline config, runs
`crm-pipeline refresh --slice 100k`, generates a smoke workload, and writes the
smoke dataset manifest.

`prepare_pipeline_runtime.py` rewrites the pipeline manifest for server paths.
It points raw source files at `/srv/crm/raw`, writes runtime files under the
benchmark root, and fails fast when expected raw files are missing.

`update_full_manifest.sh` reads an existing full database, derives a workload
from it, and writes the full dataset manifest. It does not build or promote
`contacts.sqlite`.

`run_benchmark.sh` executes `bench-search` in smoke or full mode.
`promote_baseline.sh` atomically replaces a baseline JSON file.
`update_manifest.py` writes dataset metadata with contract and workload hashes.

## GitHub workflow

The GitHub Actions workflow is `bench search`. It runs on the self-hosted
benchmark runner and has three inputs:

```text
mode=smoke|full
operation=gate|bootstrap
refresh_dataset=true|false
```

Smoke mode can rebuild its smoke dataset when `refresh_dataset=true`. Full mode
uses `refresh_dataset=true` only to refresh workload and manifest metadata for
the existing full database.

Use `operation=bootstrap` to create or replace the stored baseline for a mode.
Use `operation=gate` to compare the current result against the stored baseline.

## Common operations

Bootstrap the smoke baseline with `mode=smoke`, `operation=bootstrap`,
`refresh_dataset=true`.

Run a smoke gate with `mode=smoke`, `operation=gate`, `refresh_dataset=true`.

Bootstrap the full baseline after a full database promotion with `mode=full`,
`operation=bootstrap`, `refresh_dataset=true`.

Run a full gate with `mode=full`, `operation=gate`, `refresh_dataset=true`.
