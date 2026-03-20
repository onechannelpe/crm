#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BENCH_ROOT="${BENCH_ROOT:-/srv/crm/bench}"
RAW_SOURCE_DIR="${RAW_SOURCE_DIR:-/srv/crm/raw}"
RAW_TARGET_DIR="${RAW_TARGET_DIR:-$ROOT_DIR/crates/pipeline/data/raw}"
DATASET_VERSION="${DATASET_VERSION:-$(date +%Y%m%d-%H%M%S)}"
SYNC_RAW="${SYNC_RAW:-0}"

SMOKE_DB_PATH="${SMOKE_DB_PATH:-$BENCH_ROOT/datasets/smoke/contacts.sqlite}"
SMOKE_MANIFEST_PATH="${SMOKE_MANIFEST_PATH:-$BENCH_ROOT/manifests/smoke.json}"
WORKLOAD_PATH="${WORKLOAD_PATH:-$ROOT_DIR/crates/engine/bench/workloads/default.json}"
PROJECTION_CONTRACT_PATH="${PROJECTION_CONTRACT_PATH:-$ROOT_DIR/contracts/engine/search-projection.json}"

if [[ "$SYNC_RAW" == "1" ]]; then
  echo "[bench] syncing raw data from $RAW_SOURCE_DIR to $RAW_TARGET_DIR"
  mkdir -p "$RAW_TARGET_DIR"
  rsync -a --delete "$RAW_SOURCE_DIR"/ "$RAW_TARGET_DIR"/
fi

echo "[bench] building smoke dataset at $SMOKE_DB_PATH"
mkdir -p "$(dirname "$SMOKE_DB_PATH")"
cd "$ROOT_DIR"
cargo run -p crm-pipeline --release -- refresh --slice 100k --to "$SMOKE_DB_PATH"

echo "[bench] writing smoke dataset manifest"
python3 "$ROOT_DIR/ops/bench/update_manifest.py" \
  --db-path "$SMOKE_DB_PATH" \
  --dataset-id "search-smoke" \
  --dataset-version "$DATASET_VERSION" \
  --projection-contract-path "$PROJECTION_CONTRACT_PATH" \
  --workload-json-path "$WORKLOAD_PATH" \
  --output "$SMOKE_MANIFEST_PATH"
