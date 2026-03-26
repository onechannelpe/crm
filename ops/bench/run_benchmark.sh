#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BENCH_ROOT="${BENCH_ROOT:-/srv/crm/bench}"
MODE="${MODE:-smoke}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d-%H%M%S)}"

if [[ "$MODE" != "smoke" && "$MODE" != "full" ]]; then
  echo "MODE must be smoke or full, got: $MODE" >&2
  exit 1
fi

if [[ "$MODE" == "smoke" ]]; then
  MANIFEST_PATH="${MANIFEST_PATH:-$BENCH_ROOT/manifests/smoke.json}"
  BASELINE_PATH="${BASELINE_PATH:-$ROOT_DIR/ops/bench/baselines/smoke.json}"
  WORKLOAD_PATH="${WORKLOAD_PATH:-$BENCH_ROOT/workloads/smoke.json}"
else
  MANIFEST_PATH="${MANIFEST_PATH:-$BENCH_ROOT/manifests/full.json}"
  BASELINE_PATH="${BASELINE_PATH:-$ROOT_DIR/ops/bench/baselines/full.json}"
  WORKLOAD_PATH="${WORKLOAD_PATH:-$BENCH_ROOT/workloads/full.json}"
fi

OUTPUT_PATH="${OUTPUT_PATH:-$BENCH_ROOT/runs/${MODE}-${RUN_ID}.json}"
STRICT_BASELINE="${STRICT_BASELINE:-0}"
BENCH_SEARCH_BIN="${BENCH_SEARCH_BIN:-}"

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "manifest path not found: $MANIFEST_PATH" >&2
  exit 1
fi
if [[ ! -f "$WORKLOAD_PATH" ]]; then
  echo "workload path not found: $WORKLOAD_PATH" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"
cd "$ROOT_DIR"

if [[ -n "$BENCH_SEARCH_BIN" ]]; then
  if [[ ! -x "$BENCH_SEARCH_BIN" ]]; then
    echo "bench binary is not executable: $BENCH_SEARCH_BIN" >&2
    exit 1
  fi
  cmd=(
    "$BENCH_SEARCH_BIN"
    --mode "$MODE"
    --dataset-manifest-json "$MANIFEST_PATH"
    --workload-json "$WORKLOAD_PATH"
    --baseline-json "$BASELINE_PATH"
    --output-json "$OUTPUT_PATH"
  )
else
  cmd=(
    cargo run -p engine --bin bench-search --release --
    --mode "$MODE"
    --dataset-manifest-json "$MANIFEST_PATH"
    --workload-json "$WORKLOAD_PATH"
    --baseline-json "$BASELINE_PATH"
    --output-json "$OUTPUT_PATH"
  )
fi

if [[ "$STRICT_BASELINE" == "1" ]]; then
  cmd+=(--strict-baseline)
fi

"${cmd[@]}"
echo "$OUTPUT_PATH"
