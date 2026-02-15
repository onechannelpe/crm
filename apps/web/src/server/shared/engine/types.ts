export interface SearchResult {
  dni: string;
  name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  org_ruc: string | null;
  org_name: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
}

export type SearchType = "dni" | "ruc" | "phone" | "name";
