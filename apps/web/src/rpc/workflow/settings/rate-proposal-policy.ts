import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
import { workflowActor } from "~/server/workflow/ui/actor";

export async function saveRateProposalPolicy(input: { validityDays: number }) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.update_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },
    parse: () =>
      parseObject(input, validationFail, (reader) => ({
        validityDays: reader.posInt("validityDays"),
      })),
    audit: ({ validityDays }) => ({ validityDays }),
    execute: ({ actor, operationAt: now }, payload) =>
      application.workflow.commands.updateRateProposalPolicy(
        {
          actor: workflowActor(actor),
          validityDays: payload.validityDays,
        },
        now,
      ),
  });
}
