#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BENCH_ROOT="${BENCH_ROOT:-/srv/crm/bench}"
FULL_DB_PATH="${FULL_DB_PATH:-/srv/crm/full/contacts.sqlite}"
FULL_MANIFEST_PATH="${FULL_MANIFEST_PATH:-$BENCH_ROOT/manifests/full.json}"
DATASET_VERSION="${DATASET_VERSION:-$(date +%Y%m%d-%H%M%S)}"
WORKLOAD_PATH="${WORKLOAD_PATH:-$BENCH_ROOT/workloads/full.json}"
PROJECTION_CONTRACT_PATH="${PROJECTION_CONTRACT_PATH:-$ROOT_DIR/contracts/engine/search-projection.json}"

if [[ ! -f "$FULL_DB_PATH" ]]; then
  echo "full db path not found: $FULL_DB_PATH" >&2
  exit 1
fi

echo "[bench] generating full workload at $WORKLOAD_PATH"
python3 "$ROOT_DIR/ops/bench/generate_workload_from_db.py" \
  --db-path "$FULL_DB_PATH" \
  --output "$WORKLOAD_PATH"

python3 "$ROOT_DIR/ops/bench/update_manifest.py" \
  --db-path "$FULL_DB_PATH" \
  --dataset-id "search-full" \
  --dataset-version "$DATASET_VERSION" \
  --projection-contract-path "$PROJECTION_CONTRACT_PATH" \
  --workload-json-path "$WORKLOAD_PATH" \
  --output "$FULL_MANIFEST_PATH"
