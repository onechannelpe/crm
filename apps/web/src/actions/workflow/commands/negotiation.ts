"use server";

import { runAction } from "~/server/shared/action-runtime";
import { runWorkflowCommand } from "~/server/workflow/infrastructure/command-runtime";

export async function requestRateNegotiation(input: {
  leadId: string;
  justification: string;
  artifactIds: string[];
}) {
  return runAction({
    actionName: "workflow.request_rate_negotiation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runWorkflowCommand(({ commandApi }) =>
        commandApi.requestRateNegotiation({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          ...input,
        }),
      ),
  });
}
