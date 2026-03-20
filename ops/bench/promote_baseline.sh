#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <report-json> <baseline-json>" >&2
  exit 1
fi

REPORT_PATH="$1"
BASELINE_PATH="$2"

if [[ ! -f "$REPORT_PATH" ]]; then
  echo "report path not found: $REPORT_PATH" >&2
  exit 1
fi

mkdir -p "$(dirname "$BASELINE_PATH")"
cp "$REPORT_PATH" "${BASELINE_PATH}.tmp"
mv "${BASELINE_PATH}.tmp" "$BASELINE_PATH"
echo "promoted baseline: $BASELINE_PATH"
