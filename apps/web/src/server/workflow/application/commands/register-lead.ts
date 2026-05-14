import { randomUUIDv7 } from "bun";

import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { createLeadDraft } from "../../domain/lead/state";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { requireCapability } from "../../domain/lead/policy";
import { reassignLead } from "../../domain/lead/transitions";
import { normalizeLeadRuc } from "../../domain/lead-schema-parser";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type { PartyRepository, WorkflowUserRepository } from "../ports/entities";
import type { LeadEnrichmentQueue } from "../ports/gateways";
import type {
  LeadAssignmentRepository,
  LeadHistoryRepository,
  LeadRepository,
} from "../ports/lead";
import type { LeadUnitOfWork } from "../ports/uow";
import { writeLeadRegistrationEffects } from "./register-lead-effects";
import { ensureActiveExecutive, resolveLeadRegistration } from "./register-lead-resolution";

type Ports = {
  leads: LeadRepository;
  leadAssignments: LeadAssignmentRepository;
  leadHistory: LeadHistoryRepository;
  leadStates: LeadStateRepository;
  party: PartyRepository;
  users: WorkflowUserRepository;
  uow: LeadUnitOfWork;
  enrichmentQueue: LeadEnrichmentQueue;
};

export async function registerLead(
  input: {
    actorUserId: number;
    actorRole: Role;
    executiveId: number;
    ruc: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const canRegister = requireCapability("register", { role: input.actorRole });
  if (!canRegister.ok) return canRegister;

  const ruc = normalizeLeadRuc(input.ruc);
  if (!ruc.ok) return ruc;

  const activeExecutive = await ensureActiveExecutive({
    deps: { users: ports.users },
    executiveId: input.executiveId,
  });
  if (!activeExecutive.ok) return activeExecutive;

  const resolution = await resolveLeadRegistration({
    deps: { leads: ports.leads, users: ports.users },
    ruc: ruc.value,
    executiveId: input.executiveId,
  });
  if (!resolution.ok) return resolution;

  const now = Date.now();

  if (resolution.value.kind === "reassign") {
    const state = await ports.leadStates.findById(resolution.value.lead.id);
    if (!state) return leadNotFound();

    const transition = reassignLead(state, {
      actor: { userId: input.actorUserId, role: input.actorRole },
      toExecutiveId: input.executiveId,
      now,
    });
    if (!transition.ok) return transition;

    const committed = await ports.uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
      assignment: {
        toExecutiveId: input.executiveId,
        assignedBy: input.actorUserId,
        at: now,
      },
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  }

  const organization =
    (await ports.party.findOrganizationByRuc(ruc.value)) ??
    (await ports.party.createOrganization({
      ruc: ruc.value,
      name: ruc.value,
      address: null,
      district: null,
      department: null,
    }));

  const draft = createLeadDraft({
    organizationId: organization.id,
    ruc: ruc.value,
    razonSocial: organization.name,
    address: organization.address,
    executiveId: input.executiveId,
    createdBy: input.actorUserId,
    now,
  });
  if (!draft.ok) return draft;

  const result = await writeLeadRegistrationEffects({
    deps: {
      leads: ports.leads,
      leadAssignments: ports.leadAssignments,
      leadHistory: ports.leadHistory,
    },
    actorUserId: input.actorUserId,
    executiveId: input.executiveId,
    draft: draft.value,
    now,
  });
  if (!result.ok) return result;

  await ports.enrichmentQueue.enqueueRucVerification(ruc.value, input.actorUserId);

  return result;
}
