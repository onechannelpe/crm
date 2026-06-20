import type { CreateLeadInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { LeadCommercialScope } from "~/server/workflow/lead/domain/state";
import type { WorkflowUserRepository } from "~/server/workflow/lead/read/users-repo";
import type {
  LeadEnrichmentQueue,
  WorkflowEngineGateway,
} from "~/server/workflow/lead/write/engine-port";
import type { LeadRepository } from "~/server/workflow/lead/write/lead-repo";

import { reassignLead } from "../../lead/domain/decide";
import { requireCapability } from "../../lead/domain/policy";
import { isReservationLapsed } from "../../lead/domain/reservation";
import { createLeadDraft } from "../../lead/domain/state";
import { normalizeLeadRuc } from "../domain/parse";
import { expireLeadReservation } from "./expire-reservation";
import { writeLeadRegistrationEffects } from "./register-lead-effects";
import {
  ensureActiveExecutive,
  resolveLeadRegistration,
} from "./register-lead-resolution";
import { runLeadTransaction } from "./transition";

export async function registerLead(
  input: CreateLeadInput & {
    actor: WorkflowActor;
  },
  ports: {
    leads: LeadRepository;
    users: WorkflowUserRepository;
    engineGateway: WorkflowEngineGateway;
    enrichmentQueue: LeadEnrichmentQueue;
    executor: DatabaseExecutor;
    now: number;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  const actor = input.actor;
  const now = ports.now;

  const canRegister = requireCapability("register", { role: actor.role });

  if (!canRegister.ok) {
    return canRegister;
  }

  const ruc = normalizeLeadRuc(input.ruc);

  if (!ruc.ok) {
    return ruc;
  }

  const activeExecutive = await ensureActiveExecutive({
    deps: { users: ports.users },
    executiveId: actor.userId,
  });

  if (!activeExecutive.ok) {
    return activeExecutive;
  }

  // Lazy release: if the RUC is still held by a lapsed lead the sweep has not
  // retired yet, expire it now so this registration sees the RUC as available
  // instead of waiting for the next sweep tick.
  const heldLead = await ports.leads.findByRuc(ruc.value);

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
      leads: ports.leads,
      users: ports.users,
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
      {
        executor: ports.executor,
        now,
      },
      async (ctx) => {
        const state = await ctx.repos.leadStates.findById(leadId);

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

        const committed = await ctx.commit(transition.value, {
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

  const overlay = await ports.engineGateway.enrichByRuc(ruc.value);

  const result = await runLeadTransaction(
    {
      executor: ports.executor,
      now,
    },
    async (ctx) => {
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

      return writeLeadRegistrationEffects({
        deps: {
          leads: ctx.repos.leads,
          leadAssignments: ctx.repos.leadAssignments,
          events: ctx.repos.events,
        },
        actorUserId: actor.userId,
        executiveId: actor.userId,
        draft: draft.value,
        now: ctx.now,
      });
    },
  );

  if (!result.ok) {
    return result;
  }

  await ports.enrichmentQueue.enqueueRucVerification(ruc.value, actor.userId);

  return result;
}
