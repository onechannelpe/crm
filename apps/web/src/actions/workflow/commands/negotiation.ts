"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export type RequestRateNegotiationInput = {
  leadId: string;
  justification: string;
  artifactIds: string[];
};

export async function requestRateNegotiation(
  input: RequestRateNegotiationInput,
) {
  return runAction({
    actionName: "workflow.request_rate_negotiation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.requestRateNegotiation({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        ...input,
      }),
  });
}
