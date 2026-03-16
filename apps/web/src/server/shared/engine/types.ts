import type { CandidateStrategy } from "~/server/shared/pipeline-types";

export type {
  OrgInfo,
  PersonInfo,
  PhoneInfo,
  RoleInfo,
  SearchResponse,
  SearchResult,
} from "~/server/shared/engine/result-contract";

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

export type { CandidateStrategy };
