"use server";

import { notFoundError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { crmJobBlobStore, repos } from "~/server/shared/context";

type ImportType = "import_estado" | "import_prioridad";

function isImportType(v: string): v is ImportType {
  return v === "import_estado" || v === "import_prioridad";
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
        throw validationError("type must be import_estado or import_prioridad");
      }
      if (!file.name.toLowerCase().endsWith(".csv")) {
        throw validationError("Only CSV files are accepted");
      }

      const now = Date.now();
      const jobId = await repos.integrationJobs.create({
        type,
        status: "PENDING",
        user_id: session.userId,
        file_path: null,
        created_at: now,
      });

      const bytes = new Uint8Array(await file.arrayBuffer());
      const key = `import-${jobId}-${file.name}`;
      await crmJobBlobStore.put(key, bytes);
      await repos.integrationJobs.setFilePath(jobId, key);

      return { jobId };
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

      const job = await repos.integrationJobs.findById(jobId);
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

      return repos.integrationJobs.list(
        Math.min(filters.limit ?? 50, 200),
        filters.offset ?? 0,
      );
    },
  });
}
