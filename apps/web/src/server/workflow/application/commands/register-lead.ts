import { randomUUIDv7 } from "bun";

import type { Role } from "~/lib/auth/access/rbac";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { requireCapability } from "../../domain/lead/policy";
import { createLeadDraft } from "../../domain/lead/state";
import { reassignLead } from "../../domain/lead/transitions";
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
import { writeLeadRegistrationEffects } from "./register-lead-effects";
import {
  ensureActiveExecutive,
  resolveLeadRegistration,
} from "./register-lead-resolution";

type Ports = {
  leads: LeadRepository;
  leadStates: LeadStateRepository;
  users: WorkflowUserRepository;
  enrichmentQueue: LeadEnrichmentQueue;
  executor: DatabaseExecutor;
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
    const leadId = resolution.value.lead.id;
    return ports.executor.transaction().execute(async (tx) => {
      const txLeads = createLeadStateRepo(tx);
      const txUow = createLeadUow(tx);
      const state = await txLeads.findById(leadId);
      if (!state) return leadNotFound();

      const transition = reassignLead(state, {
        actor: { userId: input.actorUserId, role: input.actorRole },
        toExecutiveId: input.executiveId,
        now,
      });
      if (!transition.ok) return transition;

      const committed = await txUow.commit({
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
    });
  }

  const result = await ports.executor.transaction().execute(async (db) => {
    const txRepos = createWorkflowRepos(db);
    const organization =
      (await txRepos.party.findOrganizationByRuc(ruc.value)) ??
      (await txRepos.party.createOrganization({
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

    return writeLeadRegistrationEffects({
      deps: {
        leads: txRepos.leads,
        leadAssignments: txRepos.leadAssignments,
        leadHistory: txRepos.leadHistory,
      },
      actorUserId: input.actorUserId,
      executiveId: input.executiveId,
      draft: draft.value,
      now,
    });
  });
  if (!result.ok) return result;

  await ports.enrichmentQueue.enqueueRucVerification(
    ruc.value,
    input.actorUserId,
  );

  return result;
}
