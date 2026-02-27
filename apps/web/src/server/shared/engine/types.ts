export interface PersonInfo {
  dni: string;
  name: string;
  birth_date: string | null;
  birth_place: string | null;
  sex: string | null;
  marital_status: string | null;
  location_text: string | null;
  ubigeo_code: string | null;
  mother_name: string | null;
  father_name: string | null;
  email: string | null;
  ruc: string | null;
}

export interface OrgInfo {
  ruc: string;
  name: string;
  trade_name: string | null;
  company_type: string | null;
  status: string | null;
  condition: string | null;
  fiscal_address: string | null;
  registration_date: string | null;
  activity_start_date: string | null;
  line_of_business: string | null;
  economic_activity: string | null;
}

export interface RoleInfo {
  name: string;
  start_date: string | null;
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

export interface SearchResponse {
  results: SearchResult[];
  count: number;
}

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
