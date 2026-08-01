import "server-only";
import { executeSessionServerFunction } from "~/server/platform/action";
import { workflow } from "~/server/workflow/ui/composition";

export async function queryPendingQuotationPolicy() {
  return executeSessionServerFunction({
    name: "workflow.get_pending_quotation_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) =>
      workflow.queries.getPendingQuotationPolicy({
        actorRole: actor.role,
        branchId: actor.branchId,
      }),
  });
}
