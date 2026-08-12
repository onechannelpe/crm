import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function queryPendingQuotationPolicy() {
  return executeSessionServerFunction({
    name: "getApplication().workflow.get_pending_quotation_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    telemetry: () => ({}),

    execute: ({ actor }) =>
      getApplication().workflow.queries.getPendingQuotationPolicy({
        actorRole: actor.role,
        branchId: actor.branchId,
      }),
  });
}
