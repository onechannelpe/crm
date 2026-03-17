import type { LeadCandidateError } from "~/server/engine-gateway/errors";

export type LeadPolicyError =
  | { reason: "user_not_found"; message: string }
  | { reason: "unexpected"; message: string };

export type LeadAssignmentError = { reason: "unexpected"; message: string };

export type LeadRefillError =
  | { reason: "user_not_found"; message: string }
  | { reason: "refill_exhausted"; message: string }
  | {
      reason: "compensation_failed";
      message: string;
      rootReason?: string;
      rootMessage?: string;
    }
  | LeadCandidateError
  | LeadAssignmentError
  | { reason: "unexpected"; message: string };

export type LeadCapacitySnapshotError =
  | { reason: "user_not_found"; message: string }
  | { reason: "unexpected"; message: string };

export type LeadRefillGrantError =
  | { reason: "user_not_found"; message: string }
  | { reason: "unexpected"; message: string };
