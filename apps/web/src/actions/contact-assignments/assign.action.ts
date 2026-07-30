import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { executeSessionServerFunction } from "~/server/platform/action";
import { getContactAssignmentsRuntime } from "~/server/platform/container/contact-assignments-runtime";

export async function assignCurrentUserContacts() {
  "use server";

  return executeSessionServerFunction({
    name: "contact_assignments.assign_current_user",
    access: { kind: "permission", permission: "lead:work" },
    execute: (ctx) => {
      const { repos, uow, engine, leadUsageReservationPorts } =
        getContactAssignmentsRuntime();
      return assignContacts(
        {
          actorUserId: ctx.actor.userId,
          branchId: ctx.actor.branchId,
        },
        { repos, uow, engine, leadUsageReservationPorts },
      );
    },
  });
}
