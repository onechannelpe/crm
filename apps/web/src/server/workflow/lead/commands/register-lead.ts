import type { CreateLeadInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { OrganizationEnrichment } from "~/server/identity/organization/enrichment";
import type { WorkflowActor } from "~/server/workflow/actor";
import { createHistoryEvent } from "~/server/workflow/lead/domain/history";
import type { LeadCommercialScope } from "~/server/workflow/lead/domain/state";
import { createWorkflowRepos } from "~/server/workflow/repos";

import { reassignLead } from "../../lead/domain/decide";
import { requireCapability } from "../../lead/domain/policy";
import { isReservationLapsed } from "../../lead/domain/reservation";
import { createLeadDraft } from "../../lead/domain/state";
import { normalizeLeadRuc } from "../domain/parse";
import { expireLeadReservation } from "./expire-reservation";
import {
  ensureActiveExecutive,
  resolveLeadRegistration,
} from "./register-lead-resolution";
import { runLeadTransaction } from "../write/transition";

export async function registerLead(
  input: CreateLeadInput & {
    actor: WorkflowActor;
  },
  ports: {
    executor: DatabaseExecutor;
    now: number;
    identity: OrganizationEnrichment;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  const actor = input.actor;
  const now = ports.now;
  const repos = createWorkflowRepos(ports.executor);

  const canRegister = requireCapability("register", { role: actor.role });

  if (!canRegister.ok) {
    return canRegister;
  }

  const ruc = normalizeLeadRuc(input.ruc);

  if (!ruc.ok) {
    return ruc;
  }

  const activeExecutive = await ensureActiveExecutive({
    deps: { users: repos.users },
    executiveId: actor.userId,
  });

  if (!activeExecutive.ok) {
    return activeExecutive;
  }

  // Lazy release: if the RUC is still held by a lapsed lead the sweep has not
  // retired yet, expire it now so this registration sees the RUC as available
  // instead of waiting for the next sweep tick.
  const heldLead = await repos.leads.findByRuc(ruc.value);

  if (heldLead && isReservationLapsed(heldLead, now)) {
    const released = await expireLeadReservation(
      ports.executor,
      heldLead.id,
      now,
    );

    if (!released.ok) {
      return released;
    }
  }

  const resolution = await resolveLeadRegistration({
    deps: {
      leads: repos.leads,
      users: repos.users,
    },
    ruc: ruc.value,
    executiveId: actor.userId,
  });

  if (!resolution.ok) {
    return resolution;
  }

  if (resolution.value.kind === "reassign") {
    const leadId = resolution.value.lead.id;

    return runLeadTransaction(
      { executor: ports.executor, now },
      async (ctx) => {
        const state = await ctx.repos.leads.findById(leadId);

        if (!state) {
          return Err(fail("lead_not_found"));
        }

        const transition = reassignLead(state, {
          actor,
          toExecutiveId: actor.userId,
          now: ctx.now,
        });

        if (!transition.ok) {
          return transition;
        }

        const committed = await ctx.commitTransition(transition.value, {
          toExecutiveId: actor.userId,
          assignedBy: actor.userId,
          at: ctx.now,
        });

        if (!committed.ok) {
          return committed;
        }

        return Ok({ leadId: state.id });
      },
    );
  }

  const commercialScope: LeadCommercialScope = {
    currentProvider: input.currentProvider,
    currentDebitRate: input.currentDebitRate,
    currentCreditRate: input.currentCreditRate,
    gpv: input.gpv,
    ticket: input.ticket,
    settlementBank: input.settlementBank,
    posCount: input.posCount,
  };

  const overlay = await ports.identity.enrichByRuc(ruc.value);

  return runLeadTransaction({ executor: ports.executor, now }, async (ctx) => {
    const organization =
      (await ctx.repos.party.findOrganizationByRuc(ruc.value)) ??
      (await ctx.repos.party.createOrganization({
        ruc: ruc.value,
        legalName: overlay?.legalName ?? null,
        giroNegocio: input.giroNegocio,
        address: overlay?.address ?? null,
        district: null,
        department: null,
      }));

    const draft = createLeadDraft({
      organizationId: organization.id,
      ruc: ruc.value,
      legalName: organization.legalName,
      address: organization.address,
      executiveId: actor.userId,
      createdBy: actor.userId,
      commercialScope,
      now: ctx.now,
    });

    if (!draft.ok) {
      return draft;
    }

    const leadId = await ctx.repos.leads.insert(draft.value);

    await ctx.repos.leadAssignments.insert({
      leadId,
      executiveId: actor.userId,
      assignedBy: actor.userId,
      isActive: true,
      assignedAt: ctx.now,
    });

    // Registration is an append-only birth: the lead row is freshly inserted, so
    // there is no prior version to lock. The `lead_registered` event drives the
    // SUNAT enrichment reactor downstream.
    const appended = await ctx.appendFacts([
      createHistoryEvent({
        leadId,
        eventType: "lead_registered",
        actorUserId: actor.userId,
        payload: { ruc: draft.value.ruc, toStage: "QUALIFYING" },
        occurredAt: ctx.now,
      }),
      createHistoryEvent({
        leadId,
        eventType: "lead_assigned",
        actorUserId: actor.userId,
        subjectUserId: actor.userId,
        payload: { executiveId: actor.userId },
        occurredAt: ctx.now,
      }),
    ]);

    if (!appended.ok) {
      return appended;
    }

    return Ok({ leadId });
  });
}
