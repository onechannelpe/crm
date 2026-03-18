/**
 * Generates all contract artifacts from the JSON contracts in /contracts.
 * Pass --check to assert existing files are up to date instead of writing.
 *
 * Artifacts produced:
 *   contracts/engine/api.json
 *     → apps/web/src/server/shared/engine/contract.ts
 *
 *   contracts/engine/lead-api.json
 *     → crates/leads/src/contracts_generated.rs
 *     → apps/web/src/server/shared/engine/lead-contract.ts
 *
 *   contracts/engine/search-projection.json
 *     → crates/search/src/projection_contract_generated.rs
 *     → crates/search/src/result_contract_generated.rs
 *     → apps/web/src/server/shared/engine/projection-contract.ts
 *     → apps/web/src/server/shared/engine/result-contract.ts
 */

import {
  parseEngineApiSpec,
  renderEngineApiContract,
} from "../src/engine-api/index.ts";
import {
  parseLeadApiSpec,
  renderLeadContractRust,
  renderLeadContractTs,
} from "../src/lead-api/index.ts";
import {
  parseProjectionSpec,
  renderProjectionContractRust,
  renderProjectionContractTs,
  renderResultContractRust,
  renderResultContractTs,
} from "../src/search-projection/index.ts";
import { loadJson, writeOrCheck } from "../src/shared.ts";

const check = Bun.argv.includes("--check");

// ── engine API ────────────────────────────────────────────────────────────────
const engineSpec = parseEngineApiSpec(
  await loadJson("contracts/engine/api.json"),
);
await writeOrCheck(
  "apps/web/src/server/shared/engine/contract.ts",
  renderEngineApiContract(engineSpec),
  check,
);

// ── lead API ──────────────────────────────────────────────────────────────────
const leadSpec = parseLeadApiSpec(
  await loadJson("contracts/engine/lead-api.json"),
);
await writeOrCheck(
  "crates/leads/src/contracts_generated.rs",
  renderLeadContractRust(leadSpec),
  check,
);
await writeOrCheck(
  "apps/web/src/server/shared/engine/lead-contract.ts",
  renderLeadContractTs(leadSpec),
  check,
);

// ── search projection ─────────────────────────────────────────────────────────
const projSpec = parseProjectionSpec(
  await loadJson("contracts/engine/search-projection.json"),
);
await writeOrCheck(
  "crates/search/src/projection_contract_generated.rs",
  renderProjectionContractRust(projSpec),
  check,
);
await writeOrCheck(
  "crates/search/src/result_contract_generated.rs",
  renderResultContractRust(projSpec),
  check,
);
await writeOrCheck(
  "apps/web/src/server/shared/engine/projection-contract.ts",
  renderProjectionContractTs(projSpec),
  check,
);
await writeOrCheck(
  "apps/web/src/server/shared/engine/result-contract.ts",
  renderResultContractTs(projSpec),
  check,
);

console.log(check ? "all contracts are up to date" : "all contracts generated");
