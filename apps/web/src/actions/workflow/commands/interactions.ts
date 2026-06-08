"use server";

import { LEAD_CALL_OUTCOMES } from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";

import { workflowActor } from "./actor";

export async function recordLeadCall(input: unknown) {
  return runAction({
    actionName: "workflow.log_call",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        outcome: r.enum("outcome", LEAD_CALL_OUTCOMES),
        notes: r.optStr("notes"),
      })),

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

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        body: r.str("body"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.addLeadNote({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}
