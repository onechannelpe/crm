export type DirectSearchError =
  | { reason: "engine_request_failed"; message: string }
  | { reason: "unexpected"; message: string };

export type LeadCandidateError =
  | { reason: "engine_unavailable"; message: string }
  | { reason: "unexpected"; message: string };
