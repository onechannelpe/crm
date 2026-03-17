export type ScopeType = "branch" | "team";

export type PolicySource = "user" | "team" | "branch" | "system";

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

export type CandidateStrategy = "balanced" | "freshness" | "conversion";

export const CANDIDATE_STRATEGIES = [
  "balanced",
  "freshness",
  "conversion",
] as const satisfies ReadonlyArray<CandidateStrategy>;
