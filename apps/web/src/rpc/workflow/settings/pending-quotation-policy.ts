import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
import { workflowActor } from "~/server/workflow/ui/actor";

export type SavePendingQuotationPolicyInput =
  | { enabled: false }
  | { enabled: true; limit: number };

export async function savePendingQuotationPolicy(
  input: SavePendingQuotationPolicyInput,
) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.update_pending_quotation_policy",
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
    execute: ({ actor, operationAt: now }, payload) =>
      application.workflow.commands.updatePendingQuotationPolicy(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}
