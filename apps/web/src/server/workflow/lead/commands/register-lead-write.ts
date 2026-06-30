import type { CreateLeadInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { WorkflowLeadId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import { reassignLead } from "~/server/workflow/lead/domain/decide";
import { createHistoryEvent } from "~/server/workflow/lead/domain/history";
import {
  createLeadDraft,
  type LeadCommercialScope,
} from "~/server/workflow/lead/domain/state";

import { runLeadTransaction } from "../write/transition";

type RegistrationPorts = {
  executor: DatabaseExecutor;
  now: Date;
};

export function reassignRegisteredLead(input: {
  leadId: WorkflowLeadId;
  actor: WorkflowActor;
  ports: RegistrationPorts;
}): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(input.ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const transition = reassignLead(state, {
      actor: input.actor,
      toExecutiveId: input.actor.userId,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    const committed = await ctx.commitTransition(transition.value, {
      toExecutiveId: input.actor.userId,
      assignedBy: input.actor.userId,
      at: ctx.now,
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}

export function createRegisteredLead(input: {
  command: CreateLeadInput;
  actor: WorkflowActor;
  ruc: string;
  commercialScope: LeadCommercialScope;
  enrichment: { legalName: string | null; address: string | null } | null;
  ports: RegistrationPorts;
}): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(input.ports, async (ctx) => {
    const organization =
      (await ctx.repos.party.findOrganizationByRuc(input.ruc)) ??
      (await ctx.repos.party.createOrganization({
        ruc: input.ruc,
        legalName: input.enrichment?.legalName ?? null,
        giroNegocio: input.command.giroNegocio,
        address: input.enrichment?.address ?? null,
        district: null,
        department: null,
      }));

    const draft = createLeadDraft({
      organizationId: organization.id,
      ruc: input.ruc,
      legalName: organization.legalName,
      address: organization.address,
      executiveId: input.actor.userId,
      createdBy: input.actor.userId,
      commercialScope: input.commercialScope,
      now: ctx.now,
    });
    if (!draft.ok) return draft;

    const leadId = await ctx.repos.leads.insert(draft.value);
    await ctx.repos.leadAssignments.insert({
      leadId,
      executiveId: input.actor.userId,
      assignedBy: input.actor.userId,
      isActive: true,
      assignedAt: ctx.now,
    });

    const appended = await ctx.appendFacts([
      createHistoryEvent({
        leadId,
        eventType: "lead_registered",
        actorUserId: input.actor.userId,
        payload: { ruc: draft.value.ruc, toStage: "QUALIFYING" },
        occurredAt: ctx.now,
      }),
      createHistoryEvent({
        leadId,
        eventType: "lead_assigned",
        actorUserId: input.actor.userId,
        subjectUserId: input.actor.userId,
        payload: { executiveId: input.actor.userId },
        occurredAt: ctx.now,
      }),
    ]);
    if (!appended.ok) return appended;

    return Ok({ leadId });
  });
}
