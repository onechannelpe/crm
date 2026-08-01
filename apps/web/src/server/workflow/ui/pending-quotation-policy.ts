import "server-only";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";

export async function queryPendingQuotationPolicy() {
  return executeSessionServerFunction({
    name: "application.workflow.get_pending_quotation_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) =>
      application.workflow.queries.getPendingQuotationPolicy({
        actorRole: actor.role,
        branchId: actor.branchId,
      }),
  });
}
