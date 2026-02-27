// GENERATED FILE. DO NOT EDIT.
export interface PersonInfo {
  dni: string;
  name: string | null;
}

export interface OrgInfo {
  ruc: string | null;
  name: string | null;
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

export interface SearchResponse {
  results: SearchResult[];
  count: number;
}
