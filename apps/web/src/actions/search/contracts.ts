export type SearchType =
  | "dni"
  | "ruc"
  | "phone"
  | "person_name"
  | "company_name"
  | "phone_enriched";

export const SEARCH_TYPES = [
  "dni",
  "ruc",
  "phone",
  "person_name",
  "company_name",
  "phone_enriched",
] as const satisfies ReadonlyArray<SearchType>;

export function isSearchType(value: string): value is SearchType {
  return SEARCH_TYPES.some((type) => type === value);
}

export interface PersonInfo {
  dni: string;
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

export interface SearchResult {
  person: PersonInfo;
  org: OrgInfo | null;
  role: RoleInfo | null;
  phones: PhoneInfo;
}

export interface SearchResultItem {
  id: string;
  label: string;
}

export interface SearchDirectResult {
  items: readonly SearchResultItem[];
  raw: SearchResult[];
}
