import type { IntegrationJobId, UserId, WorkflowLeadId } from "~/domain/ids";
import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import type { ImportRowInput } from "~/server/integrations/application/import/types";

import type { TestActorKey } from "../database/workflow-fixtures";
import { actorBy } from "../database/workflow-fixtures";
import { seedImportJob } from "../database/workflow-seed";
import { operationAt } from "../operation";
import type { TestRuntime } from "../runtime/app";

type ImportLeadRef = {
  id: WorkflowLeadId;
  organization: { ruc: string };
};

export function createWorkflowImporter(input: {
  runtime: TestRuntime;
  resolveActorUserId?: (actor: TestActorKey) => UserId;
}) {
  const { runtime } = input;

  return {
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
    }) {
      const seededJob = await seedImportJob(runtime);
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
        },
        operationAt(runtime.now.get()),
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
        },
        operationAt(runtime.now.get()),
      );
    },
  };
}
