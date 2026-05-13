"use server";

import { AppError } from "~/lib/app-errors";
import { getServerRuntime } from "~/server/runtime";
import { runActionResult } from "~/server/shared/action-runtime";
import type { Result } from "~/server/shared/result";
import type { LeadCommandResult } from "~/server/workflow/application/contracts/command-results";

export async function requestRateNegotiation(input: {
  leadId: string;
  justification: string;
  artifactIds: string[];
}): Promise<Result<LeadCommandResult, AppError>> {
  return runActionResult({
    actionName: "workflow.request_rate_negotiation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.run(({ useCases }) =>
        useCases.requestRateNegotiation({
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
