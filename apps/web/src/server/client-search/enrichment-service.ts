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
  SearchEnrichmentProcessResult,
  SearchEnrichmentRepoPort,
  SearchEnrichmentRequestError,
  SearchEnrichmentServiceDeps,
  SearchEnrichmentServiceWithActions,
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

export function createSearchEnrichmentService(
  repos: { searchEnrichment: SearchEnrichmentRepoPort },
  deps: SearchEnrichmentServiceDeps = {},
): SearchEnrichmentServiceWithActions {
  const now = deps.now ?? (() => Date.now());
  const scraper = deps.scraper ?? createSunatScraperClient();

  async function findStatus(
    documentType: EnrichmentDocumentType,
    documentValue: string,
  ): Promise<SearchEnrichmentStatus> {
    const currentNow = now();
    const [job, overlay] = await Promise.all([
      repos.searchEnrichment.findJobByDocument(documentType, documentValue),
      repos.searchEnrichment.getOverlay(
        documentType,
        documentValue,
        currentNow,
      ),
    ]);

    const mappedOverlay = overlay
      ? {
          documentType: overlay.document_type,
          documentValue: overlay.document_value,
          fullName: overlay.full_name,
          legalName: overlay.legal_name,
          address: overlay.address,
          district: overlay.district,
          department: overlay.department,
          contributorStatus: overlay.contributor_status,
          contributorCondition: overlay.contributor_condition,
          source: overlay.source,
          fetchedAt: overlay.fetched_at,
          expiresAt: overlay.expires_at,
          payloadJson: overlay.payload_json,
        }
      : null;

    return {
      documentType,
      documentValue,
      status: job?.status ?? (overlay ? "completed" : "idle"),
      overlay: mappedOverlay,
      lastError: job?.last_error ?? null,
      requestedAt: job?.requested_at ?? null,
      completedAt: job?.completed_at ?? null,
    };
  }

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

      if (!payload) throw new Error("No enrichment data returned");

      let overlayRow: SearchEnrichmentOverlayRow;

      if (job.document_type === "dni" && !isSunatRucData(payload)) {
        const fullName =
          [
            isPlainRecord(payload) ? payload.nombres : null,
            isPlainRecord(payload) ? payload.apellidoPaterno : null,
            isPlainRecord(payload) ? payload.apellidoMaterno : null,
          ]
            .filter(
              (p): p is string => typeof p === "string" && p.trim().length > 0,
            )
            .map((p) => p.trim())
            .join(" ") || null;

        overlayRow = {
          document_type: job.document_type,
          document_value: job.document_value,
          full_name: fullName,
          legal_name: null,
          address: null,
          district: null,
          department: null,
          contributor_status: null,
          contributor_condition: null,
          source: "sunat",
          fetched_at: currentNow,
          expires_at: currentNow + OVERLAY_TTL_MS,
          payload_json: JSON.stringify(
            isPlainRecord(payload) ? payload.payload : payload,
          ),
        };
      } else if (isSunatRucData(payload)) {
        overlayRow = {
          document_type: job.document_type,
          document_value: job.document_value,
          full_name: null,
          legal_name: payload.razonSocial?.trim() || null,
          address: payload.address,
          district: payload.district,
          department: payload.department,
          contributor_status: payload.contributorStatus,
          contributor_condition: payload.contributorCondition,
          source: "sunat",
          fetched_at: currentNow,
          expires_at: currentNow + OVERLAY_TTL_MS,
          payload_json: JSON.stringify(payload.payload),
        };
      } else {
        throw new Error("Unexpected payload shape for document type");
      }

      if (signal?.aborted) throw new Error("Job aborted after processing");

      await repos.searchEnrichment.upsertOverlay(overlayRow);

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
          max_attempts: DEFAULT_MAX_ATTEMPTS,
        });
        await publishJob(JOB_CHANNELS.ENRICHMENT, jobId);
        return Ok(await findStatus(documentType, safeDocumentValue));
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
