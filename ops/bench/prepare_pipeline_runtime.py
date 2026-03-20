#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def build_paths_block(bench_root: str, manifest_path: str, engine_db_path: str) -> str:
    return "\n".join(
        [
            "[paths]",
            f'manifest = "{manifest_path}"',
            f'normalized_dir = "{bench_root}/pipeline/normalized"',
            f'staged_db = "{bench_root}/pipeline/staged/contacts.pipeline.staged.sqlite"',
            f'bench_dir = "{bench_root}/pipeline/build/bench"',
            f'engine_db = "{engine_db_path}"',
            "",
        ]
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Prepare server-native pipeline runtime config for benchmarks"
    )
    parser.add_argument("--bench-root", required=True)
    parser.add_argument("--raw-root", required=True)
    parser.add_argument("--manifest-template", required=True)
    parser.add_argument("--pipeline-config-template", required=True)
    parser.add_argument("--manifest-output", required=True)
    parser.add_argument("--pipeline-config-output", required=True)
    parser.add_argument("--engine-db-path", default="/srv/crm/full/contacts.sqlite")
    args = parser.parse_args()

    bench_root = args.bench_root.rstrip("/")
    raw_root = args.raw_root.rstrip("/")

    manifest_template = Path(args.manifest_template)
    pipeline_template = Path(args.pipeline_config_template)
    manifest_output = Path(args.manifest_output)
    pipeline_output = Path(args.pipeline_config_output)
    engine_db_path = args.engine_db_path

    if not manifest_template.exists():
        raise SystemExit(f"manifest template missing: {manifest_template}")
    if not pipeline_template.exists():
        raise SystemExit(f"pipeline config template missing: {pipeline_template}")

    manifest = json.loads(manifest_template.read_text(encoding="utf-8"))
    sources = manifest.get("sources")
    if not isinstance(sources, list):
        raise SystemExit("manifest template is missing 'sources' array")

    missing_raw_files: list[str] = []
    for source in sources:
        raw_path = str(source.get("raw_path", "")).strip()
        if not raw_path:
            raise SystemExit(
                f"source missing raw_path: {source.get('source_key', 'unknown')}"
            )
        rewritten_path = f"{raw_root}/{Path(raw_path).name}"
        source["raw_path"] = rewritten_path
        if not Path(rewritten_path).exists():
            missing_raw_files.append(rewritten_path)

    if missing_raw_files:
        preview = ", ".join(missing_raw_files[:5])
        suffix = "" if len(missing_raw_files) <= 5 else f" (+{len(missing_raw_files) - 5} more)"
        raise SystemExit(f"missing raw files under raw-root: {preview}{suffix}")

    manifest_output.parent.mkdir(parents=True, exist_ok=True)
    manifest_output.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    pipeline_text = pipeline_template.read_text(encoding="utf-8")
    marker = "\n[profiles."
    idx = pipeline_text.find(marker)
    if idx == -1:
        raise SystemExit("pipeline template does not contain [profiles.*] section")

    suffix = pipeline_text[idx + 1 :]
    output_text = build_paths_block(bench_root, str(manifest_output), engine_db_path) + suffix
    pipeline_output.parent.mkdir(parents=True, exist_ok=True)
    pipeline_output.write_text(output_text, encoding="utf-8")

    print(
        json.dumps(
            {
                "manifest_output": str(manifest_output),
                "pipeline_config_output": str(pipeline_output),
                "raw_root": raw_root,
                "engine_db_path": engine_db_path,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
