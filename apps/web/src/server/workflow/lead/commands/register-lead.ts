import type { CreateLeadInput } from "~/contracts/workflow/inputs";
import { MAX_PENDING_QUOTATION_DECISIONS } from "~/contracts/workflow/limits";
import type { OrganizationEnrichment } from "~/server/identity/organization/enrichment";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { parseRuc } from "~/server/shared/document";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { WorkflowLeadId } from "~/server/shared/ids";
import { Err, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { LeadCommercialScope } from "~/server/workflow/lead/domain/state";
import { createWorkflowRepos } from "~/server/workflow/repos";

import { requireCapability } from "../../lead/domain/policy";
import { isReservationLapsed } from "../../lead/domain/reservation";
import { expireLeadReservation } from "./expire-reservation";
import {
  ensureActiveExecutive,
  resolveLeadRegistration,
} from "./register-lead-resolution";
import {
  createRegisteredLead,
  reassignRegisteredLead,
} from "./register-lead-write";

export async function registerLead(
  input: CreateLeadInput & {
    actor: WorkflowActor;
  },
  ports: {
    executor: DatabaseExecutor;
    now: Date;
    identity: OrganizationEnrichment;
  },
): Promise<Result<{ leadId: WorkflowLeadId }, DomainError>> {
  const actor = input.actor;
  const now = ports.now;
  const repos = createWorkflowRepos(ports.executor);

  const canRegister = requireCapability("register", { role: actor.role });

  if (!canRegister.ok) {
    return canRegister;
  }

  const ruc = parseRuc(input.ruc);

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
  const heldLead = await repos.leads.findActiveByRuc(ruc.value);

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
    return reassignRegisteredLead({
      leadId: resolution.value.lead.id,
      actor,
      ports: { executor: ports.executor, now },
    });
  }

  // Cap concurrent quotations awaiting the executive's decision. Applies only to
  // the create path; a reassign resolves an existing lead rather than adding a
  // new client.
  const pendingDecisions = await repos.leads.countPendingQuotationDecisions(
    actor.userId,
    now,
  );

  if (pendingDecisions >= MAX_PENDING_QUOTATION_DECISIONS) {
    return Err(fail("pending_quotation_limit"));
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

  return createRegisteredLead({
    command: input,
    actor,
    ruc: ruc.value,
    commercialScope,
    enrichment: overlay,
    ports: { executor: ports.executor, now },
  });
}
