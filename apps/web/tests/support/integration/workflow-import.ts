import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import type { ImportRowInput } from "~/server/integrations/application/import/types";

import type { TestActorKey } from "../database/workflow-fixtures";
import { actorBy } from "../database/workflow-fixtures";
import { seedImportJob } from "../database/workflow-seed";
import type { TestRuntime } from "../runtime/app";

type ImportLeadRef = {
  id: string;
  organization: { ruc: string };
};

export function createWorkflowImporter(input: {
  runtime: TestRuntime;
  resolveActorUserId?: (actor: TestActorKey | number) => number;
  nextJobKey(key?: string): string;
}) {
  const { runtime } = input;

  const job = {
    async importRun(key: string): Promise<{ id: string }> {
      const id = `job-${key}`;
      await seedImportJob(runtime, { id });
      return { id };
    },
  };

  const jobFactory = {
    async importRun(key?: string): Promise<{ id: string }> {
      return job.importRun(input.nextJobKey(key));
    },
  };

  const importer = {
    async run(payload: {
      actor: TestActorKey | number;
      rows: Array<
        | {
            type: "status";
            lead: ImportLeadRef;
            status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK";
          }
        | {
            type: "priority";
            lead: ImportLeadRef;
            priority: "P1" | "P2" | "SIN RESULTADO";
          }
      >;
      jobKey?: string;
    }) {
      const seededJob = await jobFactory.importRun(payload.jobKey);
      const actorUserId = input.resolveActorUserId
        ? input.resolveActorUserId(payload.actor)
        : typeof payload.actor === "number"
          ? payload.actor
          : actorBy(payload.actor).userId;
      const validRows: ImportRowInput[] = payload.rows.map((row, index) => {
        const rowNo = index + 1;
        if (row.type === "status") {
          return {
            row: rowNo,
            ruc: row.lead.organization.ruc,
            type: "import_status",
            status: row.status,
          };
        }
        return {
          row: rowNo,
          ruc: row.lead.organization.ruc,
          type: "import_prioridad",
          priority: row.priority,
        };
      });

      return applyImportRows(
        {
          jobId: seededJob.id,
          actorId: actorUserId,
          validRows,
          invalidRows: [],
        },
        runtime.integrations.executor,
      );
    },

    async apply(payload: {
      jobId: string;
      actorId: number;
      rows: ImportRowInput[];
    }) {
      return applyImportRows(
        {
          jobId: payload.jobId,
          actorId: payload.actorId,
          validRows: payload.rows,
          invalidRows: [],
        },
        runtime.integrations.executor,
      );
    },
  };

  return {
    job: jobFactory,
    importer,
  };
}
