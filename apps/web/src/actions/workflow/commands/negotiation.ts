"use server";

import { type RequestRateNegotiationInput } from "~/contracts/workflow/inputs";
import { type LeadCommandResult } from "~/contracts/workflow/results";
import { AppError } from "~/lib/app-errors";
import { getServerRuntime } from "~/server/runtime";
import { runActionResult } from "~/server/shared/action-runtime";
import type { Result } from "~/server/shared/result";

export async function requestRateNegotiation(
  input: RequestRateNegotiationInput,
): Promise<Result<LeadCommandResult, AppError>> {
  return runActionResult({
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
