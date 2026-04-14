import type { SunatEconomicActivity } from "./enrichment/sunat/contracts";

export type DocumentType = "dni" | "ruc";

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

export function normalizeEnrichmentInput(input: {
  documentType: string;
  documentValue: string;
}): {
  documentType: DocumentType;
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
