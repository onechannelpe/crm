import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import type { ImportRowInput } from "~/server/integrations/application/import/types";

import type { TestRuntime } from "../runtime/app";
import { createWorkflowLeadApis } from "./leads";
import type { ScenarioActorKey, ScenarioLeadRef } from "./leads";
import { createWorkflowOutbox } from "./outbox";
import { seedImportJob } from "./seed";

export function createWorkflowScenario(runtime: TestRuntime) {
  const leadApis = createWorkflowLeadApis(runtime);

  const job = {
    async importRun(key: string): Promise<{ id: string }> {
      const id = `job-${key}`;
      await seedImportJob(runtime, { id });
      return { id };
    },
  };

  const importer = {
    async run(input: {
      actor: ScenarioActorKey | number;
      rows: Array<
        | {
            type: "status";
            lead: ScenarioLeadRef;
            status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK";
          }
        | {
            type: "priority";
            lead: ScenarioLeadRef;
            prioridad: "P1" | "P2" | "SIN RESULTADO";
          }
      >;
      jobKey?: string;
    }) {
      const job =
        input.jobKey === undefined
          ? await jobFactory.importRun()
          : await jobFactory.importRun(input.jobKey);
      const actorUserId =
        typeof input.actor === "number"
          ? input.actor
          : leadApis.actor.by(input.actor).userId;
      const validRows: ImportRowInput[] = input.rows.map((row, index) => {
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
          prioridad: row.prioridad,
        };
      });

      return applyImportRows(
        {
          jobId: job.id,
          actorId: actorUserId,
          validRows,
          invalidRows: [],
        },
        runtime.integrations.executor,
      );
    },

    async apply(input: {
      jobId: string;
      actorId: number;
      rows: ImportRowInput[];
    }) {
      return applyImportRows(
        {
          jobId: input.jobId,
          actorId: input.actorId,
          validRows: input.rows,
          invalidRows: [],
        },
        runtime.integrations.executor,
      );
    },
  };

  const jobFactory = {
    async importRun(key?: string): Promise<{ id: string }> {
      return job.importRun(leadApis.ids.nextJobKey(key));
    },
  };
  const outbox = createWorkflowOutbox(runtime);

  const notifications = {
    async list() {
      return runtime.ctx.db
        .selectFrom("app_notifications")
        .select(["user_id", "event_type", "dedupe_key"])
        .orderBy("id", "asc")
        .execute();
    },
  };

  return {
    actor: leadApis.actor,
    lead: leadApis.lead,
    job: jobFactory,
    importer,
    outbox,
    notifications,
    user: leadApis.user,
  };
}
