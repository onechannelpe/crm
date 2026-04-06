import type { Selectable } from "kysely";

import type { SearchEnrichmentJobsTable } from "~/lib/db/types";
import { isPlainRecord } from "~/lib/type-guards";
import { createSunatScraperClient } from "~/server/client-search/enrichment/sunat/client";
import type {
  SunatRucData,
  SunatScraperClient,
} from "~/server/client-search/enrichment/sunat/contracts";
import type { createSearchEnrichmentRepo } from "~/server/client-search/repos-enrichment";
import { Err, Ok, type Result } from "~/server/shared/result";

const OVERLAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

export type EnrichmentDocumentType = "dni" | "ruc";

export interface SearchEnrichmentOverlay {
  documentType: EnrichmentDocumentType;
  documentValue: string;
  fullName: string | null;
  legalName: string | null;
  source: "sunat";
  confidence: number;
  fetchedAt: number;
  expiresAt: number;
  payloadJson: string;
}

export interface SearchEnrichmentStatus {
  documentType: EnrichmentDocumentType;
  documentValue: string;
  status: "idle" | "queued" | "running" | "completed" | "failed";
  overlay: SearchEnrichmentOverlay | null;
  lastError: string | null;
  requestedAt: number | null;
  completedAt: number | null;
}

export type SearchEnrichmentRequestError =
  | { reason: "invalid_document"; message: string }
  | { reason: "unexpected"; message: string };

type SearchEnrichmentRepo = ReturnType<typeof createSearchEnrichmentRepo>;
type SearchEnrichmentJobLeaseRow = Selectable<SearchEnrichmentJobsTable>;

function isSunatRucData(value: unknown): value is SunatRucData {
  return (
    isPlainRecord(value) && typeof value.ruc === "string" && "payload" in value
  );
}

function isDigits(value: string, expectedLength: number): boolean {
  return value.length === expectedLength && /^\d+$/.test(value);
}

function normalizeDocumentValue(
  documentType: EnrichmentDocumentType,
  documentValue: string,
): Result<string, SearchEnrichmentRequestError> {
  const value = documentValue.trim();
  if (documentType === "dni") {
    if (!isDigits(value, 8)) {
      return Err({
        reason: "invalid_document",
        message: "DNI must be 8 digits",
      });
    }
    return Ok(value);
  }
  if (!isDigits(value, 11)) {
    return Err({
      reason: "invalid_document",
      message: "RUC must be 11 digits",
    });
  }
  return Ok(value);
}

function mapOverlay(row: {
  document_type: EnrichmentDocumentType;
  document_value: string;
  full_name: string | null;
  legal_name: string | null;
  source: "sunat";
  confidence: number;
  fetched_at: number;
  expires_at: number;
  payload_json: string;
}): SearchEnrichmentOverlay {
  return {
    documentType: row.document_type,
    documentValue: row.document_value,
    fullName: row.full_name,
    legalName: row.legal_name,
    source: row.source,
    confidence: row.confidence,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    payloadJson: row.payload_json,
  };
}

function extractFullName(
  documentType: EnrichmentDocumentType,
  payload: unknown,
): string | null {
  if (documentType !== "dni") return null;
  if (!isPlainRecord(payload)) return null;
  const parts = [
    payload.nombres,
    payload.apellidoPaterno,
    payload.apellidoMaterno,
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .map((part) => part.trim());
  return parts.length > 0 ? parts.join(" ") : null;
}

function extractLegalName(
  documentType: EnrichmentDocumentType,
  payload: unknown,
): string | null {
  if (documentType !== "ruc") return null;
  if (!isSunatRucData(payload)) return null;
  return payload.razonSocial?.trim() || null;
}

async function processEnrichmentJob(
  job: SearchEnrichmentJobLeaseRow,
  scraper: SunatScraperClient,
  repo: SearchEnrichmentRepo,
  currentNow: number,
  leaseOwner: string,
): Promise<void> {
  const payload =
    job.document_type === "dni"
      ? await scraper.fetchDni(job.document_value)
      : await scraper.fetchRuc(job.document_value);

  if (
    !payload ||
    (typeof payload === "object" && Object.keys(payload).length < 1)
  ) {
    await repo.markJobFailed(
      job.id,
      leaseOwner,
      "No enrichment data returned",
      currentNow,
    );
    return;
  }

  const fullName = extractFullName(job.document_type, payload);
  const legalName = extractLegalName(job.document_type, payload);

  await repo.upsertOverlay({
    document_type: job.document_type,
    document_value: job.document_value,
    full_name: fullName,
    legal_name: legalName,
    source: "sunat",
    confidence: 80,
    fetched_at: currentNow,
    expires_at: currentNow + OVERLAY_TTL_MS,
    payload_json: JSON.stringify(payload.payload),
  });
  await repo.markJobCompleted(job.id, leaseOwner, currentNow);
}

export function createSearchEnrichmentService(
  repos: { searchEnrichment: SearchEnrichmentRepo },
  deps: {
    now?: () => number;
    maxAttempts?: number;
    scraper?: SunatScraperClient;
  } = {},
) {
  const now = deps.now ?? (() => Date.now());
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const scraper: SunatScraperClient =
    deps.scraper ?? createSunatScraperClient();

  const findStatus = async (
    documentType: EnrichmentDocumentType,
    documentValue: string,
  ): Promise<SearchEnrichmentStatus> => {
    const currentNow = now();
    const [job, overlay] = await Promise.all([
      repos.searchEnrichment.findJobByDocument(documentType, documentValue),
      repos.searchEnrichment.getOverlay(
        documentType,
        documentValue,
        currentNow,
      ),
    ]);

    return {
      documentType,
      documentValue,
      status: job?.status ?? (overlay ? "completed" : "idle"),
      overlay: overlay ? mapOverlay(overlay) : null,
      lastError: job?.last_error ?? null,
      requestedAt: job?.requested_at ?? null,
      completedAt: job?.completed_at ?? null,
    };
  };

  return {
    async request(
      documentType: EnrichmentDocumentType,
      documentValue: string,
      requestedByUserId: number,
    ): Promise<Result<SearchEnrichmentStatus, SearchEnrichmentRequestError>> {
      const normalizedDocument = normalizeDocumentValue(
        documentType,
        documentValue,
      );
      if (!normalizedDocument.ok) return normalizedDocument;

      const safeDocumentValue = normalizedDocument.value;
      try {
        const currentNow = now();
        await repos.searchEnrichment.enqueueJob({
          document_type: documentType,
          document_value: safeDocumentValue,
          requested_by_user_id: requestedByUserId,
          now: currentNow,
          max_attempts: maxAttempts,
        });
        const status = await findStatus(documentType, safeDocumentValue);
        return Ok(status);
      } catch (error: unknown) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Failed to enqueue enrichment job",
        });
      }
    },

    async status(
      documentType: EnrichmentDocumentType,
      documentValue: string,
    ): Promise<Result<SearchEnrichmentStatus, SearchEnrichmentRequestError>> {
      const normalizedDocument = normalizeDocumentValue(
        documentType,
        documentValue,
      );
      if (!normalizedDocument.ok) return normalizedDocument;

      try {
        return Ok(await findStatus(documentType, normalizedDocument.value));
      } catch (error: unknown) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Failed to read enrichment status",
        });
      }
    },

    async runBatch(
      limit: number,
      leaseMs: number,
      leaseOwner: string,
    ): Promise<number> {
      const jobs = await repos.searchEnrichment.leaseJobs(
        limit,
        leaseMs,
        leaseOwner,
      );
      if (jobs.length < 1) return 0;

      // Cap concurrent SUNAT scraper requests to avoid rate-limiting.
      const CONCURRENCY = 3;
      const iter = jobs[Symbol.iterator]();
      const worker = async () => {
        for (const job of iter) {
          const currentNow = now();
          try {
            // eslint-disable-next-line no-await-in-loop
            await processEnrichmentJob(
              job,
              scraper,
              repos.searchEnrichment,
              currentNow,
              leaseOwner,
            );
          } catch (error: unknown) {
            const message =
              error instanceof Error
                ? error.message
                : "Search enrichment worker failed";
            // eslint-disable-next-line no-await-in-loop
            await repos.searchEnrichment.markJobFailed(
              job.id,
              leaseOwner,
              message,
              currentNow,
            );
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker),
      );
      return jobs.length;
    },
  };
}
