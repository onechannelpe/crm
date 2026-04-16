import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadRecord } from "../../domain/lead-record";
import {
  deriveLeadMutationEvents,
  type LeadMutationEvents,
} from "../../domain/lead/lead-events";
import { validateLeadIntent } from "../../domain/lead/lead-policies";
import { deriveLeadPatchFromIntent } from "../../domain/lead/lead-transitions";
import type { LeadMutationIntent } from "../../domain/lead/lead-types";
import type { LeadAuditRepository } from "../../ports/lead-audit-repository";
import type { LeadEventRepository } from "../../ports/lead-event-repository";
import type {
  CheckedLeadWriteRepository,
  LeadWriteRepository,
} from "../../ports/lead-write-repository";
import { writeLeadEvents } from "./lead-event-writer";

export type LeadMutationOrchestratorDeps = {
  leadWriter: LeadWriteRepository;
  checkedLeadWriter?: CheckedLeadWriteRepository;
  eventRepository: LeadEventRepository;
  auditRepository: LeadAuditRepository;
};

export async function executeLeadMutation(input: {
  deps: LeadMutationOrchestratorDeps;
  lead: LeadRecord;
  actorUserId: number;
  now: number;
  intent: LeadMutationIntent;
}): Promise<
  Result<{ events: LeadMutationEvents; historyIds: number[] }, DomainError>
> {
  const validIntent = validateLeadIntent(input.lead.stage, input.intent);
  if (!validIntent.ok) {
    return validIntent;
  }

  const patch = deriveLeadPatchFromIntent({
    lead: input.lead,
    intent: input.intent,
  });
  if (!patch.ok) {
    return patch;
  }

  await input.deps.leadWriter.updateLead({
    leadId: input.lead.id,
    actorUserId: input.actorUserId,
    now: input.now,
    patch: patch.value,
  });

  const events = deriveLeadMutationEvents({
    lead: input.lead,
    intent: input.intent,
    patch: patch.value,
    actorUserId: input.actorUserId,
    now: input.now,
  });
  if (!events.ok) {
    return events;
  }

  const historyIds = await writeLeadEvents({
    events: events.value.history,
    eventRepository: input.deps.eventRepository,
    auditRepository: input.deps.auditRepository,
    actorUserId: input.actorUserId,
    auditAction: events.value.audit.action,
    entityId: events.value.audit.entityId,
    auditChanges: events.value.audit.changes,
  });

  return Ok({ events: events.value, historyIds });
}

export async function executeCheckedLeadMutation(input: {
  deps: LeadMutationOrchestratorDeps;
  lead: LeadRecord;
  actorUserId: number;
  now: number;
  expectedUpdatedAt: number;
  intent: LeadMutationIntent;
}): Promise<
  Result<
    { applied: boolean; events?: LeadMutationEvents; historyIds?: number[] },
    DomainError
  >
> {
  const validIntent = validateLeadIntent(input.lead.stage, input.intent);
  if (!validIntent.ok) {
    return validIntent;
  }

  const patch = deriveLeadPatchFromIntent({
    lead: input.lead,
    intent: input.intent,
  });
  if (!patch.ok) {
    return patch;
  }

  if (!input.deps.checkedLeadWriter) {
    await input.deps.leadWriter.updateLead({
      leadId: input.lead.id,
      actorUserId: input.actorUserId,
      now: input.now,
      patch: patch.value,
    });
  } else {
    const updated = await input.deps.checkedLeadWriter.updateLeadChecked({
      leadId: input.lead.id,
      actorUserId: input.actorUserId,
      now: input.now,
      expectedUpdatedAt: input.expectedUpdatedAt,
      patch: patch.value,
    });
    if (!updated) {
      return Ok({ applied: false });
    }
  }

  const events = deriveLeadMutationEvents({
    lead: input.lead,
    intent: input.intent,
    patch: patch.value,
    actorUserId: input.actorUserId,
    now: input.now,
  });
  if (!events.ok) {
    return events;
  }

  const historyIds = await writeLeadEvents({
    events: events.value.history,
    eventRepository: input.deps.eventRepository,
    auditRepository: input.deps.auditRepository,
    actorUserId: input.actorUserId,
    auditAction: events.value.audit.action,
    entityId: events.value.audit.entityId,
    auditChanges: events.value.audit.changes,
  });

  return Ok({ applied: true, events: events.value, historyIds });
}
