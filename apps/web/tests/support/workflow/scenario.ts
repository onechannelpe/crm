import type { Role } from "~/lib/auth/access/rbac";
import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import type { ImportRowInput } from "~/server/integrations/application/import/types";
import { createNeedsExecutiveOutboxQueue } from "~/server/integrations/queue/integration-outbox-needs-executive-queue";
import { createReadyForQuotationOutboxQueue } from "~/server/integrations/queue/integration-outbox-ready-for-quotation-queue";

import { ISOLATED_DB_IDENTITIES } from "../identities/catalog";
import type { TestRuntime } from "../runtime/app";
import {
  seedImportJob,
  seedLeadScenario,
  seedUser,
  type SeededOrganizationRef,
} from "./seed";

type ScenarioActorKey = keyof typeof ISOLATED_DB_IDENTITIES;

type ScenarioActor = {
  userId: number;
  role: Role;
  branchId: number;
};

type ScenarioLeadSeed = {
  key?: string;
  organization: {
    key?: string;
    ruc?: string;
    name?: string;
  };
  executive: ScenarioActorKey | number;
  stage:
    | "PENDING_EXTERNAL_REVIEW"
    | "REJECTED_BY_STATUS"
    | "NEEDS_EXECUTIVE_INPUT"
    | "READY_FOR_QUOTATION"
    | "QUOTED"
    | "READY_FOR_SALE"
    | "CONVERTED";
  status?: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  prioridad?: "P1" | "P2" | "SIN RESULTADO" | null;
  createdBy?: number;
  updatedBy?: number | null;
  createdAt?: number;
  updatedAt?: number;
};

type ScenarioLeadRef = {
  id: string;
  organization: SeededOrganizationRef;
};

function resolveScenarioActor(key: ScenarioActorKey): ScenarioActor {
  const actor = ISOLATED_DB_IDENTITIES[key];
  return {
    userId: actor.userId,
    role: actor.role,
    branchId: actor.branchId,
  };
}

function resolveExecutiveUserId(input: ScenarioActorKey | number): number {
  return typeof input === "number"
    ? input
    : ISOLATED_DB_IDENTITIES[input].userId;
}

export function createWorkflowScenario(runtime: TestRuntime) {
  let generatedUserCounter = 100;

  const actor = {
    by(name: ScenarioActorKey): ScenarioActor {
      return resolveScenarioActor(name);
    },
    withRole(name: ScenarioActorKey, role: Role): ScenarioActor {
      return { ...resolveScenarioActor(name), role };
    },
    fromUser(input: {
      id: number;
      role: Role;
      branchId: number;
    }): ScenarioActor {
      return {
        userId: input.id,
        role: input.role,
        branchId: input.branchId,
      };
    },
  };

  const lead = {
    async assignedTo(
      executive: ScenarioActorKey | number,
      input: Omit<ScenarioLeadSeed, "executive"> = {
        organization: {},
        stage: "PENDING_EXTERNAL_REVIEW",
      },
    ): Promise<ScenarioLeadRef> {
      const key =
        input.key ??
        `auto-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const organizationKey = input.organization.key ?? `org-${key}`;
      const seeded = await seedLeadScenario(runtime, {
        organization: {
          key: organizationKey,
          ruc: input.organization.ruc,
          name: input.organization.name,
        },
        lead: {
          id: `lead-${key}`,
          executiveId: resolveExecutiveUserId(executive),
          stage: input.stage,
          status: input.status ?? null,
          prioridad: input.prioridad ?? null,
          createdBy: input.createdBy,
          updatedBy: input.updatedBy,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
        },
      });
      return {
        id: seeded.leadId,
        organization: seeded.organization,
      };
    },
  };

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
          : resolveScenarioActor(input.actor).userId;
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
      const safeKey =
        key ?? `auto-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return job.importRun(safeKey);
    },
  };

  const outbox = {
    async counts(status: "pending" | "completed") {
      const needsExecutive = await runtime.ctx.db
        .selectFrom("workflow_integration_outbox_needs_executive_input")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("status", "=", status)
        .executeTakeFirstOrThrow();
      const readyForQuotation = await runtime.ctx.db
        .selectFrom("workflow_integration_outbox_ready_for_quotation")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("status", "=", status)
        .executeTakeFirstOrThrow();
      return {
        needsExecutive: needsExecutive.count,
        readyForQuotation: readyForQuotation.count,
      };
    },

    async drainAll(workerId = "test-worker"): Promise<void> {
      const needsExecutiveQueue = createNeedsExecutiveOutboxQueue(workerId, {
        executor: runtime.integrations.executor,
      });
      const readyForQuotationQueue = createReadyForQuotationOutboxQueue(
        workerId,
        { executor: runtime.integrations.executor },
      );

      for (let index = 0; index < 5; index += 1) {
        await needsExecutiveQueue.runOnce();
        await readyForQuotationQueue.runOnce();
        const pending = await outbox.counts("pending");
        if (pending.needsExecutive === 0 && pending.readyForQuotation === 0) {
          return;
        }
      }
    },
  };

  const notifications = {
    async list() {
      return runtime.ctx.db
        .selectFrom("app_notifications")
        .select(["user_id", "event_type", "dedupe_key"])
        .orderBy("id", "asc")
        .execute();
    },
  };

  const user = {
    async admin(input: { branchId?: number } = {}): Promise<{ id: number }> {
      return user.create({
        id: ++generatedUserCounter,
        username: `admin.${generatedUserCounter}`,
        email: `admin.${generatedUserCounter}@test.local`,
        names: "Admin",
        firstSurname: "Test",
        secondSurname: "User",
        role: "admin",
        branchId: input.branchId ?? 1,
      });
    },

    async executive(
      input: { branchId?: number } = {},
    ): Promise<{ id: number }> {
      return user.create({
        id: ++generatedUserCounter,
        username: `exec.${generatedUserCounter}`,
        email: `exec.${generatedUserCounter}@test.local`,
        names: "Executive",
        firstSurname: "Test",
        secondSurname: "User",
        role: "executive",
        branchId: input.branchId ?? 1,
      });
    },

    async create(input: {
      id: number;
      username: string;
      email: string;
      names: string;
      firstSurname: string;
      secondSurname: string;
      role: "admin" | "executive";
      branchId?: number;
      phoneE164?: string;
      createdAt?: number;
    }): Promise<{ id: number }> {
      await seedUser(runtime, input);
      return { id: input.id };
    },
  };

  return {
    actor,
    lead,
    job: jobFactory,
    importer,
    outbox,
    notifications,
    user,
  };
}
