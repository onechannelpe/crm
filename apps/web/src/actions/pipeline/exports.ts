"use server";

import { notFoundError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { crmJobBlobStore, repos } from "~/server/shared/context";

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

      const jobId = await repos.integrationJobs.create({
        type: "export",
        status: "PENDING",
        user_id: session.userId,
        file_path: null,
        created_at: Date.now(),
      });

      return { jobId };
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

      const job = await repos.integrationJobs.findById(jobId);
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

      const job = await repos.integrationJobs.findById(jobId);
      if (!job) throw notFoundError("Export job not found");
      if (job.status !== "COMPLETED" || !job.file_path) {
        throw validationError("Export is not ready for download");
      }

      return crmJobBlobStore.get(job.file_path);
    },
  });
}
