/**
 * Generates the contract artifacts from the JSON files in /contracts.
 * Pass --check to verify that the committed artifacts are up to date.
 *
 * Generated files are committed so Rust builds do not require Bun and fresh
 * checkouts do not require a generation step.
 *
 *   contracts/engine/record-api.json
 *     -> crates/leads/src/contracts_generated.rs
 *     -> apps/web/src/contracts/engine/record-api.generated.ts
 *
 *   contracts/engine/doc-projection.json
 *     -> crates/search/src/doc_projection_contract_generated.rs
 *
 *   contracts/engine/company-projection.json
 *     -> crates/search/src/company_projection_contract_generated.rs
 *
 *   Both projection contracts
 *     -> crates/search/src/result_contract_generated.rs
 *     -> apps/web/src/contracts/search/engine-results.generated.ts
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
import { renderResultContractTs } from "../src/search-projection/render-ts.ts";
import { checkArtifact, loadJson, writeArtifact } from "../src/shared.ts";

const check = Bun.argv.includes("--check");

const recordSpec = parseRecordApiSpec(
  await loadJson("contracts/engine/record-api.json"),
);

const docSource = "contracts/engine/doc-projection.json";
const companySource = "contracts/engine/company-projection.json";

const docProjectionSpec = parseProjectionSpec(await loadJson(docSource));
const companyProjectionSpec = parseProjectionSpec(
  await loadJson(companySource),
);

const projections = [
  {
    spec: docProjectionSpec,
    prefix: "DOC_PROJECTION",
    source: docSource,
    rust: "crates/search/src/doc_projection_contract_generated.rs",
  },
  {
    spec: companyProjectionSpec,
    prefix: "COMPANY_PROJECTION",
    source: companySource,
    rust: "crates/search/src/company_projection_contract_generated.rs",
  },
];

const artifacts: { path: string; content: string }[] = [
  {
    path: "crates/leads/src/contracts_generated.rs",
    content: renderRecordContractRust(recordSpec),
  },
  {
    path: "apps/web/src/contracts/engine/record-api.generated.ts",
    content: renderRecordContractTs(recordSpec),
  },
  ...projections.map((projection) => ({
    path: projection.rust,
    content: renderProjectionContractRust(
      projection.spec,
      projection.prefix,
      projection.source,
    ),
  })),
  {
    path: "crates/search/src/result_contract_generated.rs",
    content: renderResultContractRust(docProjectionSpec, companyProjectionSpec),
  },
  {
    path: "apps/web/src/contracts/search/engine-results.generated.ts",
    content: renderResultContractTs(docProjectionSpec, companyProjectionSpec),
  },
];

const applyArtifact = check ? checkArtifact : writeArtifact;

await Promise.all(
  artifacts.map((artifact) => applyArtifact(artifact.path, artifact.content)),
);

console.log(check ? "all contracts are up to date" : "all contracts generated");
