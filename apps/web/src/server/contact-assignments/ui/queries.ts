import type { LeadCapacitySnapshot } from "~/contracts/capacity";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function getMyContactAssignmentCapacity(): Promise<LeadCapacitySnapshot> {
  return executeSessionServerFunction({
    name: "contact_assignments.get_capacity",
    access: { kind: "permission", permission: "capacity:read:self" },
    execute: (ctx) =>
      getApplication().contactAssignments.getCapacity(ctx.actor.userId, ctx),
  });
}
