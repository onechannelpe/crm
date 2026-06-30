"use server";

import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";

export async function assignCurrentUserContacts() {
  return runAction({
    name: "contact_assignments.assign_current_user",
    access: { kind: "permission", permission: "lead:work" },
    execute: (ctx) => {
      return assignContacts(
        {
          actorUserId: ctx.actor.userId,
          branchId: ctx.actor.branchId,
        },
        getServerRuntime().contactAssignments,
      );
    },
  });
}
