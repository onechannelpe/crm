import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJob } from "~/lib/redis/publisher";
import { isPlainRecord } from "~/lib/type-guards";
import { createSunatScraperClient } from "~/server/client-search/enrichment/sunat/client";
import type { SunatRucData } from "~/server/client-search/enrichment/sunat/contracts";
import { Err, Ok, type Result } from "~/server/shared/result";

import type {
  EnrichmentDocumentType,
  SearchEnrichmentJobLeaseRow,
  SearchEnrichmentOverlayRow,
  SearchEnrichmentOverlay,
  SearchEnrichmentProcessResult,
  SearchEnrichmentRepoPort,
  SearchEnrichmentRequestError,
  SearchEnrichmentService,
  SearchEnrichmentServiceDeps,
  SearchEnrichmentStatus,
} from "./types";

const OVERLAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

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

function mapOverlay(row: SearchEnrichmentOverlayRow): SearchEnrichmentOverlay {
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

export function createSearchEnrichmentService(
  repos: { searchEnrichment: SearchEnrichmentRepoPort },
  deps: SearchEnrichmentServiceDeps = {},
): SearchEnrichmentService {
  const now = deps.now ?? (() => Date.now());
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const scraper = deps.scraper ?? createSunatScraperClient();

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
    searchEnrichmentRepo: repos.searchEnrichment,
    async processJob(
      job: SearchEnrichmentJobLeaseRow,
      signal?: AbortSignal,
    ): Promise<SearchEnrichmentProcessResult> {
      const currentNow = now();
      const payload =
        job.document_type === "dni"
          ? await scraper.fetchDni(job.document_value)
          : await scraper.fetchRuc(job.document_value);

      if (signal?.aborted) throw new Error("Job aborted");

      if (
        !payload ||
        (typeof payload === "object" && Object.keys(payload).length < 1)
      ) {
        throw new Error("No enrichment data returned");
      }

      const fullName = extractFullName(job.document_type, payload);
      const legalName = extractLegalName(job.document_type, payload);

      if (signal?.aborted) throw new Error("Job aborted after processing");

      await repos.searchEnrichment.upsertOverlay({
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

      if (signal?.aborted) throw new Error("Job aborted after database update");
      return { completedAt: currentNow };
    },

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
        const jobId = await repos.searchEnrichment.enqueueJob({
          document_type: documentType,
          document_value: safeDocumentValue,
          requested_by_user_id: requestedByUserId,
          now: currentNow,
          max_attempts: maxAttempts,
        });
        await publishJob(JOB_CHANNELS.ENRICHMENT, jobId);
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
  };
}
