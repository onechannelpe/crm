import "server-only";
import type { LeadCapacitySnapshot } from "~/contracts/capacity";
import { getContactAssignmentCapacity } from "~/server/contact-assignments/application/get-contact-assignment-capacity";
import { composeContactAssignments } from "~/server/contact-assignments/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function getMyContactAssignmentCapacity(): Promise<LeadCapacitySnapshot> {
  const readRepos = composeContactAssignments().repos;
  return executeSessionServerFunction({
    name: "contact_assignments.get_capacity",
    access: { kind: "permission", permission: "capacity:read:self" },
    execute: (ctx) =>
      getContactAssignmentCapacity(
        ctx.actor.userId,
        readRepos,
        ctx.operationAt,
      ),
  });
}
