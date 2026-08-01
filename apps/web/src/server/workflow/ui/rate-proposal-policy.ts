import "server-only";
import { executeSessionServerFunction } from "~/server/platform/action";
import { workflow } from "~/server/workflow/ui/composition";

export async function queryRateProposalPolicy() {
  return executeSessionServerFunction({
    name: "workflow.get_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) =>
      workflow.queries.getRateProposalPolicy({
        actorRole: actor.role,
        branchId: actor.branchId,
      }),
  });
}
