"use server";

import { workflowActorFrom } from "~/actions/workflow/shared";
import type {
  LeadCommandResult,
  RequestRateNegotiationInput,
} from "~/contracts/workflow/inputs";
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
    execute: (ctx) =>
      getServerRuntime().workflow.commands.requestRateNegotiation({
        actor: workflowActorFrom(ctx),
        ...input,
      }),
  });
}
