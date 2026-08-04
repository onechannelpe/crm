import "server-only";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function queryPendingQuotationPolicy() {
  return executeSessionServerFunction({
    name: "application.workflow.get_pending_quotation_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    telemetry: () => ({}),

    execute: ({ actor }) =>
      application.workflow.queries.getPendingQuotationPolicy({
        actorRole: actor.role,
        branchId: actor.branchId,
      }),
  });
}
