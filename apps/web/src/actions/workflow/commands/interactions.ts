"use server";

import { LEAD_CALL_OUTCOMES } from "~/contracts/workflow/vocabulary";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import {
  addLeadNote as addLeadNoteUseCase,
  logLeadCall,
} from "~/server/workflow/lead/interaction/write";

import { workflowActor } from "./actor";

export async function recordLeadCall(input: unknown) {
  return runAction({
    name: "workflow.log_call",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        outcome: r.enum("outcome", LEAD_CALL_OUTCOMES),
        notes: r.optStr("notes"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      logLeadCall(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
  });
}

export async function addLeadNote(input: unknown) {
  return runAction({
    name: "workflow.add_note",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        body: r.str("body"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      addLeadNoteUseCase(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
  });
}
