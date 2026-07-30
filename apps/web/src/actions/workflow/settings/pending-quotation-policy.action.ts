import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getWorkflowRuntime } from "~/server/platform/container/workflow-runtime";
import { getPendingQuotationPolicy } from "~/server/workflow/policy/read/get-pending-quotation-policy";
import { updatePendingQuotationPolicy } from "~/server/workflow/policy/write/update-pending-quotation-policy";

import { workflowActor } from "../commands/actor.action";

export async function queryPendingQuotationPolicy() {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.get_pending_quotation_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) => {
      const workflow = getWorkflowRuntime();

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

// Disabled policies have no limit, so the client does not send one.
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
      parseObject(input, validationFail, (r) =>
        r.bool("enabled")
          ? { enabled: true as const, limit: r.posInt("limit") }
          : { enabled: false as const },
      ),

    audit: (payload) => ({
      enabled: payload.enabled,
      limit: payload.enabled ? payload.limit : 0,
    }),

    execute: ({ actor }, payload) => {
      const workflow = getWorkflowRuntime();

      return updatePendingQuotationPolicy(
        {
          actor: workflowActor(actor),
          ...payload,
        },
        {
          pendingQuotationPolicies: workflow.repos.pendingQuotationPolicies,
          now: workflow.now(),
        },
      );
    },
  });
}
