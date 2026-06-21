"use server";

import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { invalid } from "~/server/shared/domain-error";
import { Err } from "~/server/shared/result";

export async function assignCurrentUserContacts() {
  return runAction({
    name: "contact_assignments.assign_current_user",
    access: { kind: "permission", permission: "lead:work" },
    execute: (ctx) => {
      if (
        typeof ctx.actor.branchId !== "number" ||
        !Number.isInteger(ctx.actor.branchId) ||
        ctx.actor.branchId <= 0
      ) {
        return Promise.resolve(
          Err(invalid({ code: "lead.branch_id.invalid" })),
        );
      }

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
