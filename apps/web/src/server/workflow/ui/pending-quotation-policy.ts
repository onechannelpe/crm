import { executeSessionServerFunction } from "~/server/platform/action";
import { getPendingQuotationPolicy } from "~/server/workflow/policy/read/get-pending-quotation-policy";
import { composeWorkflow } from "~/server/workflow/ui/composition";

export async function queryPendingQuotationPolicy() {
  return executeSessionServerFunction({
    name: "workflow.get_pending_quotation_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) => {
      const workflow = composeWorkflow();

      return getPendingQuotationPolicy(
        {
          pendingQuotationPolicies: workflow.repos.pendingQuotationPolicies,
        },
        {
          actorRole: actor.role,
          branchId: actor.branchId,
        },
      );
    },
  });
}
