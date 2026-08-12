// GENERATED FILE. DO NOT EDIT.
// Source: contracts/engine/record-api.json
// Generator: tools/codegen/bin/generate.ts

export interface RecordCandidate {
  ruc: string;
  organization_name: string;
  dni: string;
  person_name: string;
  phone_primary: string;
}

export interface RecordCandidatesResponse {
  candidates: RecordCandidate[];
  count: number;
}

export interface RecordImportRow {
  ruc: string;
  organization_name: string;
  dni: string;
  person_name: string;
  phone_primary: string;
  quality_tier?: number;
  product_tag?: string;
  branch_tag?: number;
}

export interface RecordImportRequest {
  rows: RecordImportRow[];
  source: string;
}

export interface RecordImportResponse {
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
}
