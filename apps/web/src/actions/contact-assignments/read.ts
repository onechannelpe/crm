"use server";

import type { LeadCapacitySnapshot } from "~/actions/capacity/contracts";
import type { ActiveContactAssignmentView } from "~/actions/contact-assignments/contracts";
import { getActiveContactAssignments as getActiveContactAssignmentsUseCase } from "~/server/contact-assignments/application/get-active-contact-assignments";
import { getContactAssignmentCapacity } from "~/server/contact-assignments/application/get-contact-assignment-capacity";
import { createContactAssignmentReadContext } from "~/server/contact-assignments/infrastructure/read-context";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

const readRepos = createContactAssignmentReadContext();

export async function getActiveContactAssignments(): Promise<
  ActiveContactAssignmentView[]
> {
  return runAction({
    actionName: "contact_assignments.list_active",
    access: { kind: "permission", permission: "lead:work" },
    input: {},
    execute: async (ctx) =>
      Ok(await getActiveContactAssignmentsUseCase(ctx.actor.userId, readRepos)),
  });
}

export async function getMyContactAssignmentCapacity(): Promise<LeadCapacitySnapshot> {
  return runAction({
    actionName: "contact_assignments.get_capacity",
    access: { kind: "permission", permission: "capacity:read:self" },
    input: {},
    execute: (ctx) => getContactAssignmentCapacity(ctx.actor.userId, readRepos),
  });
}
