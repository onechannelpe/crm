export type GpvSnapshotState =
  | "queued"
  | "processing"
  | "needs_review"
  | "ready"
  | "active"
  | "superseded"
  | "rejected"
  | "failed";

export type GpvSnapshotIssueResolution =
  | "accept_candidate"
  | "keep_previous"
  | "exclude_candidate"
  | "reject_snapshot";
