"use server";

import { validationError } from "~/lib/app-errors";
import { type LeadCallOutcome } from "~/lib/db/types";
import {
  createLead as createLeadUseCase,
  getLeadDetail as getLeadDetailUseCase,
  listLeads as listLeadsUseCase,
  logLeadInteraction as logLeadInteractionUseCase,
} from "~/server/lead-pipeline/application/leads";
import { runAction } from "~/server/shared/action-runtime";

export async function createLead(input: { ruc: string; executiveId?: number }) {
  if (!input.ruc?.trim()) {
    throw validationError("ruc is required");
  }

  return runAction({
    actionName: "lead_pipeline.create_lead",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      createLeadUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        executiveId: input.executiveId ?? ctx.actor.userId,
        ruc: input.ruc,
      }),
  });
}

export async function listLeads(filters: {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  limit?: number;
  offset?: number;
}) {
  return runAction({
    actionName: "lead_pipeline.list_leads",
    permission: "lead:pipeline",
    input: filters,
    execute: (ctx) =>
      listLeadsUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function getLeadDetail(leadId: number) {
  return runAction({
    actionName: "lead_pipeline.get_lead_detail",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      getLeadDetailUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}

export async function logLeadCall(input: {
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string;
}) {
  return runAction({
    actionName: "lead_pipeline.log_call",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      logLeadInteractionUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId: input.leadId,
        kind: "call",
        outcome: input.outcome,
        bodyText: input.notes ?? null,
      }),
  });
}

export async function addLeadNote(input: { leadId: number; body: string }) {
  if (!input.body.trim()) {
    throw validationError("body is required");
  }

  return runAction({
    actionName: "lead_pipeline.add_note",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      logLeadInteractionUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId: input.leadId,
        kind: "note",
        bodyText: input.body,
      }),
  });
}
