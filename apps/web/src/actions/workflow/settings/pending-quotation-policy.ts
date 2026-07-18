"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { getPendingQuotationPolicy } from "~/server/workflow/policy/read/get-pending-quotation-policy";
import { updatePendingQuotationPolicy } from "~/server/workflow/policy/write/update-pending-quotation-policy";

import { workflowActor } from "../commands/actor";

export async function queryPendingQuotationPolicy() {
  return runAction({
    name: "workflow.get_pending_quotation_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) => {
      const workflow = getServerRuntime().workflow;

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

export async function savePendingQuotationPolicy(input: {
  enabled: boolean;
  limit: number;
}) {
  return runAction({
    name: "workflow.update_pending_quotation_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        enabled: r.bool("enabled"),
        limit: r.posInt("limit"),
      })),

    audit: ({ enabled, limit }) => ({ enabled, limit }),

    execute: ({ actor }, payload) => {
      const workflow = getServerRuntime().workflow;

      return updatePendingQuotationPolicy(
        {
          actor: workflowActor(actor),
          enabled: payload.enabled,
          limit: payload.limit,
        },
        {
          pendingQuotationPolicies: workflow.repos.pendingQuotationPolicies,
          now: workflow.now(),
        },
      );
    },
  });
}
