export type SearchPolicyError =
  | { reason: "user_not_found"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export type SearchAllowanceError =
  | { reason: "user_not_found"; message: string }
  | { reason: "search_exhausted"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export type SearchAllowanceSnapshotError =
  | { reason: "user_not_found"; message: string }
  | { reason: "unexpected"; message: string };

export type SearchAllowanceGrantError =
  | { reason: "user_not_found"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };
