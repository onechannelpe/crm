"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { notFoundError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { getIntegrationJobQuery } from "~/server/integrations/application/get-integration-job";
import { listIntegrationJobsQuery } from "~/server/integrations/application/list-integration-jobs";
import { queueImportJobUseCase } from "~/server/integrations/application/queue-import-job";
import { isErr } from "~/server/shared/result";

type ImportType = "import_status" | "import_prioridad";

function isImportType(v: string): v is ImportType {
  return v === "import_status" || v === "import_prioridad";
}

export async function uploadImportFile(
  formData: FormData,
): Promise<{ jobId: number }> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "integration.upload_import",
    actor,
    input: {},
    run: async () => {
      const session = await requirePermission("integration:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const file = formData.get("file");
      const type = formData.get("type");

      if (!(file instanceof File)) throw validationError("file is required");
      if (typeof type !== "string" || !isImportType(type)) {
        throw validationError("type must be import_status or import_prioridad");
      }
      if (!file.name.toLowerCase().endsWith(".csv")) {
        throw validationError("Only CSV files are accepted");
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await queueImportJobUseCase({
        type,
        actorId: session.userId,
        fileName: file.name,
        bytes,
      });
      if (isErr(result)) throwDomainError(result.error);
      return result.value;
    },
  });
}

export async function getImportJob(jobId: number) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "integration.get_import_job",
    actor,
    input: { jobId },
    run: async () => {
      const session = await requirePermission("integration:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const job = await getIntegrationJobQuery(jobId);
      if (!job) throw notFoundError("Import job not found");

      return job;
    },
  });
}

export async function listIntegrationJobs(filters: {
  limit?: number;
  offset?: number;
}) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "integration.list_jobs",
    actor,
    input: {},
    run: async () => {
      const session = await requirePermission("integration:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      return listIntegrationJobsQuery(filters);
    },
  });
}
