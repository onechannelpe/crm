// GENERATED FILE. DO NOT EDIT BY HAND.
// Source: contracts/engine/doc-projection.json + contracts/engine/company-projection.json
// Generator: tools/codegen/bin/generate.ts

export interface DocInfo {
  doc_type: string;
  doc_number: string;
  name: string | null;
  ruc: string | null;
  birth_date: string | null;
  birth_place: string | null;
  sex: string | null;
  marital_status: string | null;
  location_text: string | null;
  ubigeo_code: string | null;
  mother_name: string | null;
  father_name: string | null;
  email: string | null;
}

export interface OrgInfo {
  ruc: string | null;
  name: string | null;
  trade_name: string | null;
  company_type: string | null;
  status: string | null;
  condition: string | null;
  fiscal_address: string | null;
  registration_date: string | null;
  activity_start_date: string | null;
  line_of_business: string | null;
  economic_activity: string | null;
  ubigeo_code: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
}

export interface RoleInfo {
  name: string | null;
  start_date: string | null;
  rep_doc_type: string | null;
  rep_doc_number: string | null;
  rep_name: string | null;
}

export interface PhoneInfo {
  primary: string | null;
  secondary: string | null;
  siblings: string[] | null;
}

export interface DocumentRow {
  doc: DocInfo;
  org: OrgInfo | null;
  role: RoleInfo | null;
  phones: PhoneInfo;
}

export interface CompanyInfo {
  id: number;
  ruc: string;
  legal_name: string | null;
  trade_name: string | null;
  company_type: string | null;
  status: string | null;
  condition: string | null;
  fiscal_address: string | null;
  registration_date: string | null;
  activity_start_date: string | null;
  line_of_business: string | null;
  economic_activity: string | null;
  ubigeo_code: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
}

export interface RepInfo {
  doc_type: string | null;
  doc_number: string | null;
  name: string | null;
  role_name: string | null;
  role_start_date: string | null;
}

export interface CompanyRow {
  company: CompanyInfo;
  rep: RepInfo | null;
  phones: PhoneInfo;
}

export type SearchResult =
  | ({ kind: "document" } & DocumentRow)
  | ({ kind: "company" } & CompanyRow);

export interface SearchResponse {
  results: SearchResult[];
  count: number;
}
