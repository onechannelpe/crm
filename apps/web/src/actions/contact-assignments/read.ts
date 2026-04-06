"use server";

import type { LeadCapacitySnapshot } from "~/server/capacity/application/get-lead-capacity-snapshot";
import { getActiveContactAssignments as getActiveContactAssignmentsUseCase } from "~/server/contact-assignments/application/get-active-contact-assignments";
import { getContactAssignmentCapacity } from "~/server/contact-assignments/application/get-contact-assignment-capacity";
import type { ActiveContactAssignmentView } from "~/server/contact-assignments/application/views/active-contact-assignment-view";
import { createContactAssignmentReadContext } from "~/server/contact-assignments/infrastructure/read-context";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

const readRepos = createContactAssignmentReadContext();

export async function getActiveContactAssignments(): Promise<
  ActiveContactAssignmentView[]
> {
  return runAction({
    actionName: "contact_assignments.list_active",
    permission: "lead:work",
    input: {},
    execute: async (ctx) =>
      Ok(await getActiveContactAssignmentsUseCase(ctx.actor.userId, readRepos)),
  });
}

export async function getMyContactAssignmentCapacity(): Promise<LeadCapacitySnapshot> {
  return runAction({
    actionName: "contact_assignments.get_capacity",
    permission: "capacity:read:self",
    input: {},
    execute: (ctx) => getContactAssignmentCapacity(ctx.actor.userId, readRepos),
  });
}
