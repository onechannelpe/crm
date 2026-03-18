import type { FieldSpec, LeadApiSpec } from "./parse.ts";

export function renderLeadContractTs(spec: LeadApiSpec): string {
  const candidateFields = spec.response.candidate.fields;
  const importRowFields = spec.request.import_row.fields;

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/lead-api.json",
    "// Generator: tools/codegen/bin/generate.ts",
    "",
    renderInterface(
      "LeadCandidate",
      candidateFields.map((f) => `  ${f.name}: ${tsType(f)};`),
    ),
    "",
    renderInterface("LeadCandidatesResponse", [
      "  candidates: LeadCandidate[];",
      "  count: number;",
    ]),
    "",
    renderInterface(
      "LeadImportRow",
      importRowFields.map(
        (f) => `  ${f.optional ? `${f.name}?` : f.name}: ${tsBaseType(f)};`,
      ),
    ),
    "",
    renderInterface("LeadImportRequest", [
      "  rows: LeadImportRow[];",
      "  source: string;",
    ]),
    "",
    renderInterface("LeadImportResponse", [
      "  inserted: number;",
      "  updated: number;",
      "  skipped: number;",
      "  total: number;",
    ]),
    "",
  ].join("\n");
}

function renderInterface(name: string, lines: string[]): string {
  return [`export interface ${name} {`, ...lines, "}"].join("\n");
}

function tsType(field: FieldSpec): string {
  const base = tsBaseType(field);
  return field.optional ? `${base} | undefined` : base;
}

function tsBaseType(field: FieldSpec): string {
  return field.type === "string" ? "string" : "number";
}
