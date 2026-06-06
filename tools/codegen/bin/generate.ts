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

const artifacts: { path: string; content: string }[] = [
  {
    path: "crates/leads/src/contracts_generated.rs",
    content: renderRecordContractRust(recordSpec),
  },
  {
    path: "apps/web/src/server/shared/engine/record-contract.ts",
    content: renderRecordContractTs(recordSpec),
  },
  ...projections.flatMap((p) => [
    {
      path: p.rust,
      content: renderProjectionContractRust(p.spec, p.prefix, p.source),
    },
    {
      path: p.ts,
      content: renderProjectionContractTs(p.spec, p.prefix, p.source),
    },
  ]),
  {
    path: "crates/search/src/result_contract_generated.rs",
    content: renderResultContractRust(docProjSpec, companyProjSpec),
  },
  {
    path: "apps/web/src/server/shared/engine/result-contract.ts",
    content: renderResultContractTs(docProjSpec, companyProjSpec),
  },
];

await Promise.all(artifacts.map((a) => writeOrCheck(a.path, a.content, check)));

console.log(check ? "all contracts are up to date" : "all contracts generated");
