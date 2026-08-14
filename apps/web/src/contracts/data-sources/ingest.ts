// Client-facing mirror of apps/web/src/server/integrations/engine/ingest-contracts.ts.
// Kept as an independent, structurally-identical shape so feature code never
// imports across the server boundary; the RPC layer is what bridges the two.

export type IngestJobStep =
  | "queued"
  | "staging"
  | "gating"
  | "merging"
  | "validating"
  | "materializing"
  | "complete";

export type IngestJobOutcome = "running" | "succeeded" | "failed";

export interface IngestGateCheck {
  name: string;
  passed: boolean;
  actual: number;
  threshold: number;
  message: string;
}

export interface IngestGateResult {
  passed: boolean;
  checks: IngestGateCheck[];
}

export interface IngestJob {
  job_id: string;
  source_key: string;
  snapshot_label: string;
  step: IngestJobStep;
  outcome: IngestJobOutcome;
  snapshot_id: number | null;
  total_rows: number | null;
  accepted_rows: number | null;
  invalid_doc_rows: number | null;
  gate: IngestGateResult | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

export interface IngestSource {
  source_key: string;
  source_name: string;
}
