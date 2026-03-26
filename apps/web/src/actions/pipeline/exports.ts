"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { notFoundError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { getIntegrationJobQuery } from "~/server/integrations/application/get-integration-job";
import { queueExportJobUseCase } from "~/server/integrations/application/queue-export-job";
import { jobBlobStore } from "~/server/shared/pipeline-runtime";
import { isErr } from "~/server/shared/result";

export async function queueLeadExport(): Promise<{ jobId: number }> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "integration.queue_export",
    actor,
    input: {},
    run: async () => {
      const session = await requirePermission("integration:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await queueExportJobUseCase({ actorId: session.userId });
      if (isErr(result)) throwDomainError(result.error);
      return result.value;
    },
  });
}

export async function getExportJob(jobId: number) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "integration.get_export_job",
    actor,
    input: { jobId },
    run: async () => {
      const session = await requirePermission("integration:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const job = await getIntegrationJobQuery(jobId);
      if (!job) throw notFoundError("Export job not found");

      return job;
    },
  });
}

export async function downloadExport(jobId: number): Promise<Uint8Array> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "integration.download_export",
    actor,
    input: { jobId },
    run: async () => {
      const session = await requirePermission("integration:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const job = await getIntegrationJobQuery(jobId);
      if (!job) throw notFoundError("Export job not found");
      if (job.status !== "COMPLETED" || !job.file_path) {
        throw validationError("Export is not ready for download");
      }

      return jobBlobStore.get(job.file_path);
    },
  });
}
