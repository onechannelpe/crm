import { invalid, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type { SunatEconomicActivity } from "./enrichment/sunat/contracts";

export type DocumentType = "dni" | "ruc";

export type EnrichmentTarget = {
  documentType: DocumentType;
  documentValue: string;
};

type Lifecycle = "idle" | "queued" | "running" | "succeeded" | "failed";

type Freshness = "fresh" | "stale" | "none";

export interface Overlay {
  documentType: DocumentType;
  documentValue: string;
  fullName: string | null;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributorStatus: string | null;
  contributorCondition: string | null;
  economicActivities: SunatEconomicActivity[];
  source: "sunat";
  fetchedAt: number;
  expiresAt: number;
  payloadJson: string;
}

export interface EnrichmentStatus {
  documentType: DocumentType;
  documentValue: string;
  lifecycle: Lifecycle;
  freshness: Freshness;
  overlay: Overlay | null;
  lastError: string | null;
  requestedAt: number | null;
}

export type EnrichmentError =
  | { kind: "not_found" }
  | { kind: "server_error"; detail?: string }
  | { kind: "timeout" }
  | { kind: "malformed_response"; detail?: string }
  | { kind: "invalid_document"; message: string };

export type ProcessResult =
  | { ok: true; overlay: Overlay }
  | { ok: false; error: EnrichmentError; shouldRetry: boolean };

function isDigits(value: string): boolean {
  return /^\d+$/.test(value);
}

export function parseDocument(
  documentType: string,
  documentValue: string,
): Result<EnrichmentTarget, DomainError> {
  const value = documentValue.trim();

  if (documentType !== "dni" && documentType !== "ruc") {
    return Err(invalid({ code: "enrichment.document_type.invalid" }));
  }

  if (documentType === "dni") {
    if (value.length !== 8 || !isDigits(value)) {
      return Err(invalid({ code: "enrichment.dni.invalid" }));
    }
    return Ok({ documentType, documentValue: value });
  }

  if (value.length !== 11 || !isDigits(value)) {
    return Err(invalid({ code: "enrichment.ruc.invalid" }));
  }

  return Ok({ documentType, documentValue: value });
}

// Throwing facade for trusted internal callers that pass a hardcoded type and
// an already-validated value. A failure here is a real invariant violation,
// not user input, so it surfaces as a fault rather than a validation error.
export function normalizeEnrichmentInput(input: {
  documentType: string;
  documentValue: string;
}): EnrichmentTarget {
  const parsed = parseDocument(input.documentType, input.documentValue);
  if (isErr(parsed)) {
    throw new Error(`invalid enrichment document: ${parsed.error.code}`);
  }
  return parsed.value;
}
