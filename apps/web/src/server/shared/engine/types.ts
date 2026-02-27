export type {
  OrgInfo,
  PersonInfo,
  PhoneInfo,
  RoleInfo,
  SearchResponse,
  SearchResult,
} from "~/server/shared/engine/result-contract";

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
