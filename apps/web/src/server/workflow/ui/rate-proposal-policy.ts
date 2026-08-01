import "server-only";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";

export async function queryRateProposalPolicy() {
  return executeSessionServerFunction({
    name: "application.workflow.get_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) =>
      application.workflow.queries.getRateProposalPolicy({
        actorRole: actor.role,
        branchId: actor.branchId,
      }),
  });
}
