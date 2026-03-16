export type ScopeType = "branch" | "team";

export type PolicySource = "user" | "team" | "branch" | "system";

export type CandidateStrategy = "balanced" | "freshness" | "conversion";

export const CANDIDATE_STRATEGIES = [
  "balanced",
  "freshness",
  "conversion",
] as const satisfies ReadonlyArray<CandidateStrategy>;
