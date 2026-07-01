import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import type { ImportRowInput } from "~/server/integrations/application/import/types";
import {
  asIntegrationJobId,
  type IntegrationJobId,
  type UserId,
  type WorkflowLeadId,
} from "~/server/shared/ids";

import type { TestActorKey } from "../database/workflow-fixtures";
import { actorBy } from "../database/workflow-fixtures";
import { seedImportJob } from "../database/workflow-seed";
import type { TestRuntime } from "../runtime/app";

type ImportLeadRef = {
  id: WorkflowLeadId;
  organization: { ruc: string };
};

export function createWorkflowImporter(input: {
  runtime: TestRuntime;
  resolveActorUserId?: (actor: TestActorKey) => UserId;
  nextJobKey(key?: string): string;
}) {
  const { runtime } = input;

  const job = {
    async importRun(key: string): Promise<{ id: IntegrationJobId }> {
      const id = asIntegrationJobId(`job-${key}`);
      await seedImportJob(runtime, { id });
      return { id };
    },
  };

  const jobFactory = {
    async importRun(key?: string): Promise<{ id: IntegrationJobId }> {
      return job.importRun(input.nextJobKey(key));
    },
  };

  const importer = {
    async run(payload: {
      actor: TestActorKey;
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
        {
          executor: runtime.integrations.executor,
          now: runtime.integrations.now(),
        },
      );
    },

    async apply(payload: {
      jobId: IntegrationJobId;
      actorId: UserId;
      rows: ImportRowInput[];
    }) {
      return applyImportRows(
        {
          jobId: payload.jobId,
          actorId: payload.actorId,
          validRows: payload.rows,
          invalidRows: [],
        },
        {
          executor: runtime.integrations.executor,
          now: runtime.integrations.now(),
        },
      );
    },
  };

  return {
    job: jobFactory,
    importer,
  };
}
