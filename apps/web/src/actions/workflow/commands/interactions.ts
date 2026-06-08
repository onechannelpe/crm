"use server";

import type {
  AddLeadNoteInput,
  LogLeadCallInput,
} from "~/contracts/workflow/inputs";
import { LEAD_CALL_OUTCOMES } from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";

import { workflowActor } from "./actor";

function parseLogLeadCall(
  input: unknown,
): Result<LogLeadCallInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    outcome: r.enum("outcome", LEAD_CALL_OUTCOMES),
    notes: r.optStr("notes"),
  }));
}

function parseAddLeadNote(
  input: unknown,
): Result<AddLeadNoteInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    body: r.str("body"),
  }));
}

export async function recordLeadCall(input: unknown) {
  return runAction({
    actionName: "workflow.log_call",
    access: { kind: "auth" },
    parse: () => parseLogLeadCall(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.logLeadCall({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function addLeadNote(input: unknown) {
  return runAction({
    actionName: "workflow.add_note",
    access: { kind: "auth" },
    parse: () => parseAddLeadNote(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.addLeadNote({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}
