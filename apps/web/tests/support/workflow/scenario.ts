import type { Role } from "~/lib/auth/access/rbac";

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

type ScenarioLeadInput = {
  key: string;
  organization: {
    key: string;
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
  leadId: string;
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
  return typeof input === "number" ? input : ISOLATED_DB_IDENTITIES[input].userId;
}

export function createWorkflowScenario(runtime: TestRuntime) {
  return {
    actor(name: ScenarioActorKey): ScenarioActor {
      return resolveScenarioActor(name);
    },

    async givenLead(input: ScenarioLeadInput): Promise<ScenarioLeadRef> {
      const seeded = await seedLeadScenario(runtime, {
        organization: input.organization,
        lead: {
          id: `lead-${input.key}`,
          executiveId: resolveExecutiveUserId(input.executive),
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
        leadId: seeded.leadId,
        organization: seeded.organization,
      };
    },

    async givenImportJob(jobKey: string): Promise<{ jobId: string }> {
      const jobId = `job-${jobKey}`;
      await seedImportJob(runtime, { id: jobId });
      return { jobId };
    },

    async givenUser(input: {
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
    }): Promise<{ userId: number }> {
      await seedUser(runtime, input);
      return { userId: input.id };
    },
  };
}
