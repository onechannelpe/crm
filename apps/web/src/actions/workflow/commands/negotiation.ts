"use server";

import type { RequestRateNegotiationInput } from "~/contracts/workflow/inputs";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";

import { workflowActor } from "./actor";

function parseRequestRateNegotiation(
  input: unknown,
): Result<RequestRateNegotiationInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    justification: r.str("justification"),
    artifactIds: r.strList("artifactIds"),
  }));
}

export async function requestRateNegotiation(input: unknown) {
  return runAction({
    actionName: "workflow.request_rate_negotiation",
    access: { kind: "auth" },
    parse: () => parseRequestRateNegotiation(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.requestRateNegotiation({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}
