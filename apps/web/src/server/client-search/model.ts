export type EnrichmentDocumentType = "dni" | "ruc";

export type EnrichmentLifecycle =
  | "idle"
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export type EnrichmentFreshness = "fresh" | "stale" | "none";

export interface EnrichmentOverlay {
  documentType: EnrichmentDocumentType;
  documentValue: string;
  fullName: string | null;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributorStatus: string | null;
  contributorCondition: string | null;
  source: "sunat";
  fetchedAt: number;
  expiresAt: number;
  payloadJson: string;
}

export interface EnrichmentStatus {
  documentType: EnrichmentDocumentType;
  documentValue: string;
  lifecycle: EnrichmentLifecycle;
  freshness: EnrichmentFreshness;
  overlay: EnrichmentOverlay | null;
  lastError: string | null;
  requestedAt: number | null;
}

export type EnrichmentError =
  | { kind: "not_found" }
  | { kind: "server_error"; detail?: string }
  | { kind: "timeout" }
  | { kind: "malformed_response"; detail?: string }
  | { kind: "invalid_document"; message: string };

export type EnrichmentProcessResult =
  | { ok: true; overlay: EnrichmentOverlay }
  | { ok: false; error: EnrichmentError; shouldRetry: boolean };

function isDigits(value: string): boolean {
  return /^\d+$/.test(value);
}

export function normalizeEnrichmentInput(input: {
  documentType: string;
  documentValue: string;
}): {
  documentType: EnrichmentDocumentType;
  documentValue: string;
} {
  const documentType = input.documentType;
  const documentValue = input.documentValue.trim();

  if (documentType !== "dni" && documentType !== "ruc") {
    throw new Error("Invalid document type");
  }

  if (documentType === "dni") {
    if (documentValue.length !== 8 || !isDigits(documentValue)) {
      throw new Error("Invalid DNI");
    }
    return { documentType, documentValue };
  }

  if (documentValue.length !== 11 || !isDigits(documentValue)) {
    throw new Error("Invalid RUC");
  }

  return { documentType, documentValue };
}
