import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function queryRateProposalPolicy() {
  return executeSessionServerFunction({
    name: "getApplication().workflow.get_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    telemetry: () => ({}),

    execute: ({ actor }) =>
      getApplication().workflow.queries.getRateProposalPolicy({
        actorRole: actor.role,
        branchId: actor.branchId,
      }),
  });
}
