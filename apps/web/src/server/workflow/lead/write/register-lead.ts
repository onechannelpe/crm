import type { SettlementBank } from "~/contracts/workflow/vocabulary";
import type { Role } from "~/lib/auth/access/rbac";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { LeadRepository } from "~/server/workflow/lead/read/queries-port";
import type {
  LeadEnrichmentQueue,
  WorkflowEngineGateway,
} from "~/server/workflow/lead/write/engine-port";
import type {
  LeadCommercialScope,
  WorkflowUserRepository,
} from "~/server/workflow/ports";

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
  input: {
    actorUserId: number;
    actorRole: Role;
    ruc: string;
    currentProvider: string;
    currentDebitRate: number;
    currentCreditRate: number;
    gpv: number;
    ticket: number;
    giroNegocio: string;
    settlementBank: SettlementBank;
    posCount: number;
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
  const canRegister = requireCapability("register", { role: input.actorRole });
  if (!canRegister.ok) return canRegister;

  const ruc = normalizeLeadRuc(input.ruc);
  if (!ruc.ok) return ruc;

  const activeExecutive = await ensureActiveExecutive({
    deps: { users: ports.users },
    executiveId: input.actorUserId,
  });
  if (!activeExecutive.ok) return activeExecutive;

  const now = ports.now;

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
    if (!released.ok) return released;
  }

  const resolution = await resolveLeadRegistration({
    deps: { leads: ports.leads, users: ports.users },
    ruc: ruc.value,
    executiveId: input.actorUserId,
  });
  if (!resolution.ok) return resolution;

  if (resolution.value.kind === "reassign") {
    const leadId = resolution.value.lead.id;
    return runLeadTransaction(
      { executor: ports.executor, now },
      async (ctx) => {
        const state = await ctx.repos.leadStates.findById(leadId);
        if (!state) return Err(fail("lead_not_found"));

        const transition = reassignLead(state, {
          actor: { userId: input.actorUserId, role: input.actorRole },
          toExecutiveId: input.actorUserId,
          now: ctx.now,
        });
        if (!transition.ok) return transition;

        const committed = await ctx.commit(transition.value, {
          toExecutiveId: input.actorUserId,
          assignedBy: input.actorUserId,
          at: ctx.now,
        });
        if (!committed.ok) return committed;

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
    { executor: ports.executor, now },
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
        executiveId: input.actorUserId,
        createdBy: input.actorUserId,
        commercialScope,
        now: ctx.now,
      });
      if (!draft.ok) return draft;

      return writeLeadRegistrationEffects({
        deps: {
          leads: ctx.repos.leads,
          leadAssignments: ctx.repos.leadAssignments,
          events: ctx.repos.events,
        },
        actorUserId: input.actorUserId,
        executiveId: input.actorUserId,
        draft: draft.value,
        now: ctx.now,
      });
    },
  );
  if (!result.ok) return result;

  await ports.enrichmentQueue.enqueueRucVerification(
    ruc.value,
    input.actorUserId,
  );

  return result;
}
