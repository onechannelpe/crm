import type { FieldSpec, RecordApiSpec } from "./parse.ts";

export function renderRecordContractTs(spec: RecordApiSpec): string {
  const candidateFields = spec.response.candidate.fields;
  const importRowFields = spec.request.import_row.fields;

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/record-api.json",
    "// Generator: tools/codegen/bin/generate.ts",
    "",
    renderInterface(
      "RecordCandidate",
      candidateFields.map((f) => `  ${f.name}: ${tsType(f)};`),
    ),
    "",
    renderInterface("RecordCandidatesResponse", [
      "  candidates: RecordCandidate[];",
      "  count: number;",
    ]),
    "",
    renderInterface(
      "RecordImportRow",
      importRowFields.map(
        (f) => `  ${f.optional ? `${f.name}?` : f.name}: ${tsBaseType(f)};`,
      ),
    ),
    "",
    renderInterface("RecordImportRequest", [
      "  rows: RecordImportRow[];",
      "  source: string;",
    ]),
    "",
    renderInterface("RecordImportResponse", [
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
