import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { SunatScraperClient } from "~/server/client-search/enrichment/sunat/contracts";
import type { Overlay } from "~/server/client-search/model";
import type {
  CompanyRegistryPort,
  OrganizationProjection,
  RegistryRow,
} from "~/server/client-search/ports";
import {
  processEnrichmentJob,
  overlayToPatch,
} from "~/server/client-search/process";

// When SUNAT is unreachable the engine fallback supplies the legal name and
// address only; the rest of the registry fields stay null. The degraded record
// expires quickly so the next refresh re-attempts the authoritative scrape.
type EngineFallback = (
  ruc: string,
) => Promise<{ legalName: string | null; address: string | null } | null>;

type EnrichmentWorkerDeps = {
  registry: CompanyRegistryPort;
  scraper: SunatScraperClient;
  engineFallback: EngineFallback;
  projectOrganization: (input: OrganizationProjection) => Promise<void>;
  now?: () => Date;
};

const DEGRADED_TTL_MS = 60 * 60 * 1000; // 1 hour

export function createEnrichmentQueue(
  workerId: string,
  deps: EnrichmentWorkerDeps,
) {
  const { registry, scraper, engineFallback, projectOrganization } = deps;
  const now = deps.now ?? (() => new Date());

  async function project(overlay: Overlay): Promise<void> {
    if (overlay.documentType !== "ruc") return;
    await projectOrganization({
      ruc: overlay.documentValue,
      legalName: overlay.legalName,
      address: overlay.address,
      district: overlay.district,
      department: overlay.department,
    });
  }

  async function fallbackOverlay(job: RegistryRow): Promise<Overlay | null> {
    if (job.document_type !== "ruc") return null;
    const hit = await engineFallback(job.document_value);
    if (!hit) return null;
    const fetchedAt = now();
    return {
      documentType: "ruc",
      documentValue: job.document_value,
      fullName: null,
      legalName: hit.legalName,
      address: hit.address,
      district: null,
      department: null,
      contributorStatus: null,
      contributorCondition: null,
      economicActivities: [],
      source: "engine",
      fetchedAt,
      expiresAt: new Date(fetchedAt.getTime() + DEGRADED_TTL_MS),
      payload: null,
    };
  }

  return createJobQueue<RegistryRow>({
    name: "enrichment",
    leaseMs: 30_000,
    maxConcurrency: 3,
    now,
    workerId,
    store: registry.store,
    handle: async (job, signal) => {
      const result = await processEnrichmentJob(job, scraper, signal, now());

      if (result.ok) {
        // The result columns ride the engine's settle; the org projection is an
        // inline idempotent local write (a projection failure rethrows, so the
        // job retries and re-projects).
        await project(result.overlay);
        return { kind: "done", patch: overlayToPatch(result.overlay) };
      }

      // Authoritative negative: SUNAT has no record. Settle done, no result.
      if (result.error.kind === "not_found") {
        return { kind: "done" };
      }

      const exhausted = job.attempt_count >= job.max_attempts;
      if (result.shouldRetry && !exhausted) {
        return { kind: "retry", reason: `enrichment:${result.error.kind}` };
      }

      // Could not reach the authority. Fall back to the engine so the record is
      // not left empty; a miss (or a DNI) is a terminal failure.
      const fallback = await fallbackOverlay(job);
      if (fallback) {
        await project(fallback);
        return { kind: "done", patch: overlayToPatch(fallback) };
      }
      return { kind: "fail", reason: `enrichment:${result.error.kind}` };
    },
  });
}
