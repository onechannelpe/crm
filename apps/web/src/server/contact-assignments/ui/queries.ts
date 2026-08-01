import "server-only";
import type { LeadCapacitySnapshot } from "~/contracts/capacity";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";

export async function getMyContactAssignmentCapacity(): Promise<LeadCapacitySnapshot> {
  return executeSessionServerFunction({
    name: "contact_assignments.get_capacity",
    access: { kind: "permission", permission: "capacity:read:self" },
    execute: (ctx) =>
      application.contactAssignments.getCapacity(
        ctx.actor.userId,
        ctx.operationAt,
      ),
  });
}
