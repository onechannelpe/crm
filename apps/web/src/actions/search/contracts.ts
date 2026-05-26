export type { SearchResult } from "~/server/shared/engine/types";

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

export interface SearchResultItem {
  id: string;
  label: string;
}

export interface SearchDirectResult {
  items: readonly SearchResultItem[];
  raw: SearchResult[];
}
