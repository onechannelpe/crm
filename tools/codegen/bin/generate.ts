/**
 * Generates all contract artifacts from the JSON contracts in /contracts.
 * Pass --check to assert existing files are up to date instead of writing.
 *
 * Artifacts produced:
 *   contracts/engine/record-api.json
 *     -> crates/leads/src/contracts_generated.rs
 *     -> apps/web/src/server/shared/engine/record-contract.ts
 *
 *   contracts/engine/doc-projection.json + contracts/engine/company-projection.json
 *     -> crates/search/src/doc_projection_contract_generated.rs
 *     -> crates/search/src/company_projection_contract_generated.rs
 *     -> crates/search/src/result_contract_generated.rs
 *     -> apps/web/src/server/shared/engine/doc-projection-contract.ts
 *     -> apps/web/src/server/shared/engine/company-projection-contract.ts
 *     -> apps/web/src/server/shared/engine/result-contract.ts
 */

import {
  parseRecordApiSpec,
  renderRecordContractRust,
  renderRecordContractTs,
} from "../src/record-api.ts";
import { parseProjectionSpec } from "../src/search-projection/parse.ts";
import {
  renderProjectionContractRust,
  renderResultContractRust,
} from "../src/search-projection/render-rust.ts";
import {
  renderProjectionContractTs,
  renderResultContractTs,
} from "../src/search-projection/render-ts.ts";
import { loadJson, writeOrCheck } from "../src/shared.ts";

const check = Bun.argv.includes("--check");

const recordSpec = parseRecordApiSpec(
  await loadJson("contracts/engine/record-api.json"),
);
await writeOrCheck(
  "crates/leads/src/contracts_generated.rs",
  renderRecordContractRust(recordSpec),
  check,
);
await writeOrCheck(
  "apps/web/src/server/shared/engine/record-contract.ts",
  renderRecordContractTs(recordSpec),
  check,
);

// doc and company are independent projection contracts. Each drives one Rust
// and one TS path set.
const docSource = "contracts/engine/doc-projection.json";
const companySource = "contracts/engine/company-projection.json";
const docProjSpec = parseProjectionSpec(await loadJson(docSource));
const companyProjSpec = parseProjectionSpec(await loadJson(companySource));

const projections = [
  {
    spec: docProjSpec,
    prefix: "DOC_PROJECTION",
    source: docSource,
    rust: "crates/search/src/doc_projection_contract_generated.rs",
    ts: "apps/web/src/server/shared/engine/doc-projection-contract.ts",
  },
  {
    spec: companyProjSpec,
    prefix: "COMPANY_PROJECTION",
    source: companySource,
    rust: "crates/search/src/company_projection_contract_generated.rs",
    ts: "apps/web/src/server/shared/engine/company-projection-contract.ts",
  },
];
for (const p of projections) {
  await writeOrCheck(
    p.rust,
    renderProjectionContractRust(p.spec, p.prefix, p.source),
    check,
  );
  await writeOrCheck(
    p.ts,
    renderProjectionContractTs(p.spec, p.prefix, p.source),
    check,
  );
}

// result contracts combine both projections into the SearchResult union
await writeOrCheck(
  "crates/search/src/result_contract_generated.rs",
  renderResultContractRust(docProjSpec, companyProjSpec),
  check,
);
await writeOrCheck(
  "apps/web/src/server/shared/engine/result-contract.ts",
  renderResultContractTs(docProjSpec, companyProjSpec),
  check,
);

console.log(check ? "all contracts are up to date" : "all contracts generated");
