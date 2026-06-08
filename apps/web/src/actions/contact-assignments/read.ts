"use server";

import type { LeadCapacitySnapshot } from "~/actions/capacity/contracts";
import type { ActiveContactAssignmentView } from "~/server/contact-assignments/application/contracts";
import { getActiveContactAssignments as getActiveContactAssignmentsUseCase } from "~/server/contact-assignments/application/get-active-contact-assignments";
import { getContactAssignmentCapacity } from "~/server/contact-assignments/application/get-contact-assignment-capacity";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

export async function getActiveContactAssignments(): Promise<
  ActiveContactAssignmentView[]
> {
  const readRepos = getServerRuntime().contactAssignments.repos;
  return runAction({
    actionName: "contact_assignments.list_active",
    access: { kind: "permission", permission: "lead:work" },
    execute: async (ctx) =>
      Ok(await getActiveContactAssignmentsUseCase(ctx.actor.userId, readRepos)),
  });
}

export async function getMyContactAssignmentCapacity(): Promise<LeadCapacitySnapshot> {
  const readRepos = getServerRuntime().contactAssignments.repos;
  return runAction({
    actionName: "contact_assignments.get_capacity",
    access: { kind: "permission", permission: "capacity:read:self" },
    execute: (ctx) => getContactAssignmentCapacity(ctx.actor.userId, readRepos),
  });
}
