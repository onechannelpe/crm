import type { Role } from "~/lib/auth/access/rbac";

import { createDeterministicIdFactory } from "../_core/ids";
import { ISOLATED_DB_IDENTITIES } from "../identities/catalog";
import type { TestRuntime } from "../runtime/app";
import { seedLeadScenario, seedUser, type SeededOrganizationRef } from "./seed";

export type ScenarioActorKey = keyof typeof ISOLATED_DB_IDENTITIES;

export type ScenarioActor = {
  userId: number;
  role: Role;
  branchId: number;
};

export type ScenarioLeadSeed = {
  key?: string;
  organization: {
    key?: string;
    ruc?: string;
    name?: string;
  };
  executive: ScenarioActorKey | number;
  stage:
    | "QUALIFYING"
    | "DISQUALIFIED"
    | "SCOPING"
    | "QUOTING"
    | "QUOTED"
    | "CLOSING"
    | "LIVE";
  status?: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  prioridad?: "P1" | "P2" | "SIN RESULTADO" | null;
  createdBy?: number;
  updatedBy?: number | null;
  createdAt?: number;
  updatedAt?: number;
};

export type ScenarioLeadRef = {
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

export function createWorkflowLeadApis(runtime: TestRuntime) {
  let generatedUserCounter = 100;
  const generatedIds = createDeterministicIdFactory("workflow-scenario");

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
        stage: "QUALIFYING",
      },
    ): Promise<ScenarioLeadRef> {
      const key = input.key ?? generatedIds.next("lead");
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
      createdAt?: number;
    }): Promise<{ id: number }> {
      await seedUser(runtime, input);
      return { id: input.id };
    },
  };

  const ids = {
    nextJobKey(input?: string): string {
      return input ?? generatedIds.next("job");
    },
  };

  return {
    actor,
    lead,
    user,
    ids,
  };
}
