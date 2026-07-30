"use server";

import type { LeadCapacitySnapshot } from "~/contracts/capacity";
import type { ActiveContactAssignmentView } from "~/contracts/contact-assignments/views";
import { getActiveContactAssignments as getActiveContactAssignmentsUseCase } from "~/server/contact-assignments/application/get-active-contact-assignments";
import { getContactAssignmentCapacity } from "~/server/contact-assignments/application/get-contact-assignment-capacity";
import { executeSessionServerFunction } from "~/server/platform/action";
import { getContactAssignmentsRuntime } from "~/server/platform/container/contact-assignments-runtime";
import { Ok } from "~/shared/result";

export async function getActiveContactAssignments(): Promise<
  ActiveContactAssignmentView[]
> {
  const readRepos = getContactAssignmentsRuntime().repos;
  return executeSessionServerFunction({
    name: "contact_assignments.list_active",
    access: { kind: "permission", permission: "lead:work" },
    execute: async (ctx) =>
      Ok(await getActiveContactAssignmentsUseCase(ctx.actor.userId, readRepos)),
  });
}

export async function getMyContactAssignmentCapacity(): Promise<LeadCapacitySnapshot> {
  const readRepos = getContactAssignmentsRuntime().repos;
  return executeSessionServerFunction({
    name: "contact_assignments.get_capacity",
    access: { kind: "permission", permission: "capacity:read:self" },
    execute: (ctx) => getContactAssignmentCapacity(ctx.actor.userId, readRepos),
  });
}
