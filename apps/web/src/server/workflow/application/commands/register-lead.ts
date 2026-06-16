import { randomUUIDv7 } from "bun";

import type { AbonoBank } from "~/contracts/workflow/vocabulary";
import type { Role } from "~/lib/auth/access/rbac";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { reassignLead } from "../../domain/lead/commands";
import { requireCapability } from "../../domain/lead/policy";
import { isReservationLapsed } from "../../domain/lead/reservation";
import { createLeadDraft } from "../../domain/lead/state";
import {
  createLeadStateRepo,
  type LeadStateRepository,
} from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";
import { normalizeLeadRuc } from "../../parsers";
import type { WorkflowUserRepository } from "../ports/entities";
import type { LeadEnrichmentQueue } from "../ports/gateways";
import type { LeadRepository } from "../ports/lead";
import { expireLeadReservation } from "./expire-reservation";
import { writeLeadRegistrationEffects } from "./register-lead-effects";
import {
  ensureActiveExecutive,
  resolveLeadRegistration,
} from "./register-lead-resolution";

export async function registerLead(
  input: {
    actorUserId: number;
    actorRole: Role;
    ruc: string;
    razonSocial: string;
    address: string;
    proveedorActual: string;
    tasaActual: number;
    gpv: number;
    ticket: number;
    giroNegocio: string;
    abonoBank: AbonoBank;
    posTotal: number;
  },
  ports: {
    leads: LeadRepository;
    leadStates: LeadStateRepository;
    users: WorkflowUserRepository;
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
    return ports.executor.transaction().execute(async (tx) => {
      const txLeads = createLeadStateRepo(tx);
      const txUow = createLeadUow(tx);
      const state = await txLeads.findById(leadId);
      if (!state) return Err(fail("lead_not_found"));

      const transition = reassignLead(state, {
        actor: { userId: input.actorUserId, role: input.actorRole },
        toExecutiveId: input.actorUserId,
        now,
      });
      if (!transition.ok) return transition;

      const committed = await txUow.commit({
        next: transition.value.next,
        events: transition.value.events,
        idempotencyKey: randomUUIDv7(),
        assignment: {
          toExecutiveId: input.actorUserId,
          assignedBy: input.actorUserId,
          at: now,
        },
      });
      if (!committed.ok) return committed;

      return Ok({ leadId: state.id });
    });
  }

  const result = await ports.executor.transaction().execute(async (db) => {
    const txRepos = createWorkflowRepos(db);
    // A new organization is seeded with the identity the agent confirmed at
    // registration (SUNAT-prefilled or hand-entered), so the lead is never born
    // with a placeholder name. An existing organization keeps its canonical data.
    const organization =
      (await txRepos.party.findOrganizationByRuc(ruc.value)) ??
      (await txRepos.party.createOrganization({
        ruc: ruc.value,
        name: input.razonSocial,
        address: input.address.trim() || null,
        district: null,
        department: null,
      }));

    const draft = createLeadDraft({
      organizationId: organization.id,
      ruc: ruc.value,
      razonSocial: organization.name,
      address: organization.address,
      executiveId: input.actorUserId,
      createdBy: input.actorUserId,
      now,
    });
    if (!draft.ok) return draft;

    const effects = await writeLeadRegistrationEffects({
      deps: {
        leads: txRepos.leads,
        leadAssignments: txRepos.leadAssignments,
        events: txRepos.events,
      },
      actorUserId: input.actorUserId,
      executiveId: input.actorUserId,
      draft: draft.value,
      now,
    });
    if (!effects.ok) return effects;

    // The lead is born complete: back office needs the commercial scope in the
    // export to qualify the lead, so it is captured at registration.
    await txRepos.leadProfiles.upsert({
      leadId: effects.value.leadId,
      proveedorActual: input.proveedorActual,
      tasaActual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      linkScope: "none",
      linkUrl: null,
      onlineScope: "none",
      onlineUrl: null,
      onlineModalidad: null,
      abonoBank: input.abonoBank,
      posTotal: input.posTotal,
      updatedAt: now,
      updatedBy: input.actorUserId,
    });

    await txRepos.party.updateOrganizationCommercial({
      organizationId: organization.id,
      giroNegocio: input.giroNegocio,
    });

    return effects;
  });
  if (!result.ok) return result;

  await ports.enrichmentQueue.enqueueRucVerification(
    ruc.value,
    input.actorUserId,
  );

  return result;
}
