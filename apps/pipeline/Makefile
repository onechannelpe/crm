ROOT := ../..
PIPELINE_MANIFEST := apps/pipeline/Cargo.toml

RUN_ID ?=
BASE_RUN ?=
CANDIDATE_RUN ?=
ROW_CAP ?= 10000

RUNS_DIR := data/pipeline/runs
TRIAGE_DIR := data/pipeline/triage
NORMALIZED_DIR := data/normalized

.PHONY: verify refresh-dev refresh-dev-10k validate-quick validate-standard bench-quick bench-standard bench-heavy build-full promote capture-run generate-triage compare-runs

verify:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- verify-manifest

refresh-dev:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- refresh --slice 100k

refresh-dev-10k:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- refresh --slice 10k

validate-quick:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- validate --profile quick

validate-standard:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- validate --profile standard

bench-quick:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- bench --profile quick

bench-standard:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- bench --profile standard

bench-heavy:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- bench --profile heavy

build-full:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- build --profile full

promote:
	cd $(ROOT) && cargo run --release --manifest-path $(PIPELINE_MANIFEST) -- promote

capture-run:
	@if [ -z "$(RUN_ID)" ]; then echo "RUN_ID is required"; exit 1; fi
	mkdir -p $(RUNS_DIR)/$(RUN_ID)
	cp -R $(NORMALIZED_DIR)/* $(RUNS_DIR)/$(RUN_ID)/

generate-triage:
	@if [ -z "$(RUN_ID)" ]; then echo "RUN_ID is required"; exit 1; fi
	mkdir -p $(TRIAGE_DIR)
	cd $(ROOT) && UV_CACHE_DIR=.uv-cache uv run python scripts/one-shot/pipeline-generate-triage-template.py \
		--run-dir apps/pipeline/$(RUNS_DIR)/$(RUN_ID) \
		--out apps/pipeline/$(TRIAGE_DIR)/triage-$(RUN_ID).json

compare-runs:
	@if [ -z "$(BASE_RUN)" ]; then echo "BASE_RUN is required"; exit 1; fi
	@if [ -z "$(CANDIDATE_RUN)" ]; then echo "CANDIDATE_RUN is required"; exit 1; fi
	mkdir -p $(TRIAGE_DIR)
	cd $(ROOT) && UV_CACHE_DIR=.uv-cache uv run python scripts/one-shot/pipeline-compare-slice-runs.py \
		--base apps/pipeline/$(RUNS_DIR)/$(BASE_RUN) \
		--candidate apps/pipeline/$(RUNS_DIR)/$(CANDIDATE_RUN) \
		--out apps/pipeline/$(TRIAGE_DIR)/run-diff-$(BASE_RUN)-vs-$(CANDIDATE_RUN).json
