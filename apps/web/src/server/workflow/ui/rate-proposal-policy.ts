import "server-only";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function queryRateProposalPolicy() {
  return executeSessionServerFunction({
    name: "application.workflow.get_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    telemetry: () => ({}),

    execute: ({ actor }) =>
      application.workflow.queries.getRateProposalPolicy({
        actorRole: actor.role,
        branchId: actor.branchId,
      }),
  });
}
