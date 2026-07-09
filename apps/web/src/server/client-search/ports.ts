import type { Selectable } from "kysely";

import type { CompanyRegistryRecordTable } from "~/lib/db/schema/modules/search.types";
import type { JobStore } from "~/lib/job-queue/job-store";
import type { DocumentKind } from "~/server/shared/document";

export type RegistryRow = Selectable<CompanyRegistryRecordTable>;

export type EnrichmentRequest = {
  documentType: DocumentKind;
  documentValue: string;
  requestedByUserId: string | null;
  requestedAt: Date;
  maxAttempts: number;
};

// The enrichment worker hands this to the identity side after a scrape (or
// engine fallback) so the organization row reflects the latest registry data:
// an inline, idempotent local write, not a second queue.
export type OrganizationProjection = {
  ruc: string;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
};

export interface CompanyRegistryPort {
  // The worker drives the store through the queue engine; result columns are
  // written as the engine settles the row.
  store: JobStore<string, RegistryRow>;
  // Insert or reset the record to `pending` and wake the queue on the same
  // executor so a wrapping transaction buffers the NOTIFY to commit.
  upsertRequest(values: EnrichmentRequest): Promise<string>;
  upsertRequests(values: EnrichmentRequest[]): Promise<void>;
  getRecord(
    documentType: DocumentKind,
    documentValue: string,
  ): Promise<RegistryRow | null | undefined>;
}
