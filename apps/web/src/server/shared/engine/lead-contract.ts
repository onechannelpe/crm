// GENERATED FILE. DO NOT EDIT.
// Source: contracts/engine/lead-api.json
// Generator: tools/codegen/bin/generate-lead-contract.ts

export interface LeadCandidate {
  ruc: string;
  organization_name: string;
  dni: string;
  person_name: string;
  phone_primary: string;
}

export interface LeadCandidatesResponse {
  candidates: LeadCandidate[];
  count: number;
}

export interface LeadImportRow {
  ruc: string;
  organization_name: string;
  dni: string;
  person_name: string;
  phone_primary: string;
  quality_tier?: number;
  product_tag?: string;
  branch_tag?: number;
}

export interface LeadImportRequest {
  rows: LeadImportRow[];
  source: string;
}

export interface LeadImportResponse {
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
}
