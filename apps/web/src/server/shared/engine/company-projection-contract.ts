// GENERATED FILE. DO NOT EDIT.
// Source: contracts/engine/company-projection.json
// Generator: tools/codegen/bin/generate.ts

export const COMPANY_PROJECTION_NAME = "company_projection" as const;
export const COMPANY_PROJECTION_PATHS = [
  "company.ruc",
  "company.legal_name",
  "company.trade_name",
  "company.company_type",
  "company.status",
  "company.condition",
  "company.fiscal_address",
  "company.registration_date",
  "company.activity_start_date",
  "company.line_of_business",
  "company.economic_activity",
  "company.ubigeo_code",
  "company.department",
  "company.province",
  "company.district",
  "rep.doc_type",
  "rep.doc_number",
  "rep.name",
  "rep.role_name",
  "rep.role_start_date",
  "phones.primary",
  "phones.secondary",
  "phones.siblings",
] as const;
export type COMPANY_PROJECTION_PATH = (typeof COMPANY_PROJECTION_PATHS)[number];

export const COMPANY_PROJECTION_NULLABLE_PATHS = [
  "company.legal_name",
  "company.trade_name",
  "company.company_type",
  "company.status",
  "company.condition",
  "company.fiscal_address",
  "company.registration_date",
  "company.activity_start_date",
  "company.line_of_business",
  "company.economic_activity",
  "company.ubigeo_code",
  "company.department",
  "company.province",
  "company.district",
  "rep.doc_type",
  "rep.doc_number",
  "rep.name",
  "rep.role_name",
  "rep.role_start_date",
  "phones.primary",
  "phones.secondary",
  "phones.siblings",
] as const;
export type COMPANY_PROJECTION_NULLABLE_PATH =
  (typeof COMPANY_PROJECTION_NULLABLE_PATHS)[number];
