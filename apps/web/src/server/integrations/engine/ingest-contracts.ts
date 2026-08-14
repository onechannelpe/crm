// Shapes of the engine's ingest job API.
//
// Hand-written rather than generated: the contract codegen in tools/codegen
// renders flat field lists and has no representation for the nested `gate`
// object. The owner of these shapes is crates/engine/src/ingest/job.rs
// (`JobRecord`) and crates/engine/src/ingest/contracts.rs. Anything added
// there must be added here, and `decodeIngestJob` below is what catches drift
// at runtime.

import { isPlainRecord } from "~/shared/type-guards";

export interface RegisterUploadInput {
  /** A source key the engine has compiled in, e.g. "osiptel_scan_sunat". */
  sourceKey: string;
  /** Identifies this delivery. Re-posting a label replaces that snapshot. */
  snapshotLabel: string;
  /** YYYY-MM-DD. */
  snapshotDate: string;
  /** Declared upfront so the blob step can reject a mismatch mid-stream. */
  sizeBytes: number;
  /** Lowercase hex SHA-256 of the file. */
  sha256: string;
}

/** A single gate check, mirroring `pipeline::gate::GateCheck`. */
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

export type IngestJobStep =
  | "queued"
  | "staging"
  | "gating"
  | "merging"
  | "validating"
  | "materializing"
  | "complete";

export type IngestJobOutcome = "running" | "succeeded" | "failed";

export interface IngestJob {
  job_id: string;
  source_key: string;
  snapshot_label: string;
  /** The step reached. On a failure this is the step that failed. */
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

const JOB_STEPS = new Set<string>([
  "queued",
  "staging",
  "gating",
  "merging",
  "validating",
  "materializing",
  "complete",
]);

const JOB_OUTCOMES = new Set<string>(["running", "succeeded", "failed"]);

function isJobStep(value: unknown): value is IngestJobStep {
  return typeof value === "string" && JOB_STEPS.has(value);
}

function isJobOutcome(value: unknown): value is IngestJobOutcome {
  return typeof value === "string" && JOB_OUTCOMES.has(value);
}

function isGateResult(value: unknown): value is IngestGateResult {
  return (
    isPlainRecord(value) &&
    typeof value.passed === "boolean" &&
    Array.isArray(value.checks) &&
    value.checks.every(
      (check) =>
        isPlainRecord(check) &&
        typeof check.name === "string" &&
        typeof check.passed === "boolean" &&
        typeof check.message === "string",
    )
  );
}

/** Counters are absent until the staging step has run, so null is expected. */
function optionalCount(value: unknown, field: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "number") {
    throw new TypeError(`IngestJob.${field} must be a number when present`);
  }
  return value;
}

export function decodeIngestJob(value: unknown): IngestJob {
  if (!isPlainRecord(value)) {
    throw new TypeError("Invalid IngestJob structure");
  }

  const { job_id, source_key, snapshot_label, step, outcome } = value;
  if (
    typeof job_id !== "string" ||
    typeof source_key !== "string" ||
    typeof snapshot_label !== "string" ||
    !isJobStep(step) ||
    !isJobOutcome(outcome)
  ) {
    throw new TypeError("Invalid IngestJob structure");
  }

  const { created_at, updated_at } = value;
  if (typeof created_at !== "number" || typeof updated_at !== "number") {
    throw new TypeError("IngestJob timestamps must be numbers");
  }

  const gate = value.gate ?? null;
  if (gate !== null && !isGateResult(gate)) {
    throw new TypeError("Invalid IngestJob gate structure");
  }

  return {
    job_id,
    source_key,
    snapshot_label,
    step,
    outcome,
    snapshot_id: optionalCount(value.snapshot_id, "snapshot_id"),
    total_rows: optionalCount(value.total_rows, "total_rows"),
    accepted_rows: optionalCount(value.accepted_rows, "accepted_rows"),
    invalid_doc_rows: optionalCount(value.invalid_doc_rows, "invalid_doc_rows"),
    gate,
    error: typeof value.error === "string" ? value.error : null,
    created_at,
    updated_at,
  };
}

export function decodeRegisterUploadResponse(value: unknown): {
  uploadId: string;
} {
  if (!isPlainRecord(value) || typeof value.upload_id !== "string") {
    throw new Error("Invalid RegisterUploadResponse structure");
  }
  return { uploadId: value.upload_id };
}

export function decodeUploadBlobResponse(value: unknown): {
  jobId: string;
} {
  if (!isPlainRecord(value) || typeof value.job_id !== "string") {
    throw new Error("Invalid UploadBlobResponse structure");
  }
  return { jobId: value.job_id };
}

/** A source the engine can ingest, e.g. { source_key: "osiptel_scan_sunat", source_name: "OSIPTEL scan - SUNAT lookup" }. */
export interface IngestSource {
  source_key: string;
  source_name: string;
}

function isIngestSource(value: unknown): value is IngestSource {
  return (
    isPlainRecord(value) &&
    typeof value.source_key === "string" &&
    typeof value.source_name === "string"
  );
}

export function decodeIngestSources(value: unknown): IngestSource[] {
  if (!isPlainRecord(value) || !Array.isArray(value.sources)) {
    throw new TypeError("Invalid ListIngestSourcesResponse structure");
  }
  if (!value.sources.every(isIngestSource)) {
    throw new TypeError("Invalid IngestSource structure");
  }
  return value.sources;
}
