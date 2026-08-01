import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";

export async function assignCurrentUserContacts() {
  "use server";

  return executeSessionServerFunction({
    name: "contact_assignments.assign_current_user",
    access: { kind: "permission", permission: "lead:work" },
    execute: (ctx) =>
      application.contactAssignments.assign({
        actorUserId: ctx.actor.userId,
        branchId: ctx.actor.branchId,
        at: ctx.operationAt,
      }),
  });
}
