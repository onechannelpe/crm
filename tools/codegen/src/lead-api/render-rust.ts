import type { FieldSpec, LeadApiSpec } from "./parse.ts";

export function renderLeadContractRust(spec: LeadApiSpec): string {
  const candidateFields = spec.response.candidate.fields;
  const importRowFields = spec.request.import_row.fields;

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/lead-api.json",
    "// Generator: tools/codegen/bin/generate.ts",
    "use serde::{Deserialize, Serialize};",
    "",
    "#[derive(Debug, Serialize, Clone)]",
    "pub struct LeadCandidate {",
    ...candidateFields.map((f) => `    pub ${f.name}: ${rustType(f)},`),
    "}",
    "",
    "#[derive(Debug, Serialize)]",
    "pub struct LeadCandidatesResponse {",
    "    pub candidates: Vec<LeadCandidate>,",
    "    pub count: usize,",
    "}",
    "",
    "#[derive(Debug, Deserialize, Clone)]",
    "pub struct LeadImportRow {",
    ...importRowFields.map((f) => `    pub ${f.name}: ${rustType(f)},`),
    "}",
    "",
    "#[derive(Debug, Deserialize)]",
    "pub struct LeadImportRequest {",
    "    pub rows: Vec<LeadImportRow>,",
    "    pub source: String,",
    "}",
    "",
    "#[derive(Debug, Serialize)]",
    "pub struct LeadImportResponse {",
    "    pub inserted: usize,",
    "    pub updated: usize,",
    "    pub skipped: usize,",
    "    pub total: usize,",
    "}",
    "",
  ].join("\n");
}

function rustType(field: FieldSpec): string {
  const base =
    field.type === "string" ? "String" : field.type === "i32" ? "i32" : "i64";
  return field.optional ? `Option<${base}>` : base;
}
