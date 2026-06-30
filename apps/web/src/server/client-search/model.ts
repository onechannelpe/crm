import type { DocumentKind } from "~/server/shared/document";

import type { SunatEconomicActivity } from "./enrichment/sunat/contracts";

type Lifecycle = "idle" | "queued" | "running" | "succeeded" | "failed";

type Freshness = "fresh" | "stale" | "none";

export interface Overlay {
  documentType: DocumentKind;
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
  fetchedAt: Date;
  expiresAt: Date;
  payloadJson: string;
}

export interface EnrichmentStatus {
  documentType: DocumentKind;
  documentValue: string;
  lifecycle: Lifecycle;
  freshness: Freshness;
  overlay: Overlay | null;
  lastError: string | null;
  requestedAt: Date | null;
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
