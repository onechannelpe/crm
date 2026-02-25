ROW_CAP ?= 10000
RUN_ID ?=
BASE_RUN ?=
CANDIDATE_RUN ?=

ROOT := ../..
RUNS_DIR := data/pipeline/runs
TRIAGE_DIR := data/pipeline/triage
NORMALIZED_DIR := data/normalized

.PHONY: validate-slice capture-run generate-triage compare-runs

validate-slice:
	cd $(ROOT) && cargo run --manifest-path apps/pipeline/Cargo.toml -- normalize-matrix --row-cap $(ROW_CAP)

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
