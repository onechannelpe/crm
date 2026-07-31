import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { updatePendingQuotationPolicy } from "~/server/workflow/policy/write/update-pending-quotation-policy";
import { workflowActor } from "~/server/workflow/ui/actor";
import { composeWorkflow } from "~/server/workflow/ui/composition";

export type SavePendingQuotationPolicyInput =
  | { enabled: false }
  | { enabled: true; limit: number };

export async function savePendingQuotationPolicy(
  input: SavePendingQuotationPolicyInput,
) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.update_pending_quotation_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },
    parse: () =>
      parseObject(input, validationFail, (reader) =>
        reader.bool("enabled")
          ? { enabled: true as const, limit: reader.posInt("limit") }
          : { enabled: false as const },
      ),
    audit: (payload) => ({
      enabled: payload.enabled,
      limit: payload.enabled ? payload.limit : 0,
    }),
    execute: ({ actor }, payload) => {
      const workflow = composeWorkflow();
      return updatePendingQuotationPolicy(
        { actor: workflowActor(actor), ...payload },
        {
          pendingQuotationPolicies: workflow.repos.pendingQuotationPolicies,
          now: workflow.now(),
        },
      );
    },
  });
}
