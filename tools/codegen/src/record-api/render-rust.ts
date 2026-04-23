import type { FieldSpec, RecordApiSpec } from "./parse.ts";

export function renderRecordContractRust(spec: RecordApiSpec): string {
  const candidateFields = spec.response.candidate.fields;
  const importRowFields = spec.request.import_row.fields;

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/record-api.json",
    "// Generator: tools/codegen/bin/generate.ts",
    "use serde::{Deserialize, Serialize};",
    "",
    "#[derive(Debug, Serialize, Clone)]",
    "pub struct RecordCandidate {",
    ...candidateFields.map((f) => `    pub ${f.name}: ${rustType(f)},`),
    "}",
    "",
    "#[derive(Debug, Serialize)]",
    "pub struct RecordCandidatesResponse {",
    "    pub candidates: Vec<RecordCandidate>,",
    "    pub count: usize,",
    "}",
    "",
    "#[derive(Debug, Deserialize, Clone)]",
    "pub struct RecordImportRow {",
    ...importRowFields.map((f) => `    pub ${f.name}: ${rustType(f)},`),
    "}",
    "",
    "#[derive(Debug, Deserialize)]",
    "pub struct RecordImportRequest {",
    "    pub rows: Vec<RecordImportRow>,",
    "    pub source: String,",
    "}",
    "",
    "#[derive(Debug, Serialize)]",
    "pub struct RecordImportResponse {",
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
