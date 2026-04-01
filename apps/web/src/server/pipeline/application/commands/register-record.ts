import type { Role } from "~/lib/auth/access/rbac";
import {
  pipelineAuditService,
  pipelineEngineGateway,
  createPipelineDeps,
} from "~/server/pipeline/infrastructure/deps";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  ensureCanReassignRecord,
  decideRegistrationConflict,
} from "../../domain/assignment";
import { createHistoryEvent } from "../../domain/history";
import { createRecordDraft } from "../../domain/record";

type PipelineCommandDeps = ReturnType<typeof createPipelineDeps>;
type PipelineAuditService = typeof pipelineAuditService;
type PipelineEngineGateway = typeof pipelineEngineGateway;

export async function registerRecordWithDeps(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
  ruc: string;
  deps: PipelineCommandDeps;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
}): Promise<Result<{ leadId: number }, DomainError>> {
  const ruc = input.ruc.trim();
  if (!ruc) {
    return Err(domainError("validation", "invalid_ruc", "RUC is required"));
  }

  const enrichment = await input.engineGateway.enrichByRuc(ruc);
  const now = Date.now();
  const draft = createRecordDraft({
    ruc,
    razonSocial: enrichment?.razonSocial ?? null,
    address: enrichment?.address ?? null,
    executiveId: input.executiveId,
    now,
  });
  if (!draft.ok) {
    return draft;
  }

  const targetExecutive = await input.deps.users.findById(input.executiveId);
  if (!targetExecutive || !targetExecutive.is_active) {
    return Err(
      domainError(
        "validation",
        "invalid_executive",
        "Target executive not found or inactive",
      ),
    );
  }

  const existing = await input.deps.records.findByRuc(ruc);
  if (existing) {
    const existingExecutive = await input.deps.users.findById(
      existing.executive_id,
    );
    const duplicateDecision = decideRegistrationConflict({
      existingStage: existing.stage,
      hasActiveExecutive: existingExecutive?.is_active === 1,
    });

    if (duplicateDecision === "conflict") {
      return Err(
        domainError(
          "conflict",
          "ruc_conflict",
          "A record with this RUC already exists",
        ),
      );
    }

    const canReassign = ensureCanReassignRecord({
      currentExecutiveId: existing.executive_id,
      newExecutiveId: input.executiveId,
    });
    if (!canReassign.ok) {
      return canReassign;
    }

    await input.deps.assignments.deactivateActiveForRecord(existing.id);
    await input.deps.assignments.insert({
      lead_id: existing.id,
      executive_id: input.executiveId,
      assigned_by: input.actorUserId,
      is_active: 1,
      assigned_at: now,
    });
    await input.deps.records.updateById(existing.id, {
      executive_id: input.executiveId,
      updated_at: now,
    });
    await input.deps.history.insert(
      createHistoryEvent({
        leadId: existing.id,
        eventType: "record_reassigned",
        actorUserId: input.actorUserId,
        subjectUserId: input.executiveId,
        payload: {
          fromExecutiveId: existing.executive_id,
          toExecutiveId: input.executiveId,
          reason: "inactive_previous_executive",
        },
        occurredAt: now,
      }),
    );
    await input.auditService.log(
      input.actorUserId,
      "record_reassigned",
      "lead",
      existing.id,
      {
        from: existing.executive_id,
        to: input.executiveId,
        reason: "inactive_previous_executive",
      },
    );

    return Ok({ leadId: existing.id });
  }

  const leadId = await input.deps.records.insert(draft.value);
  await input.deps.assignments.insert({
    lead_id: leadId,
    executive_id: input.executiveId,
    assigned_by: input.actorUserId,
    is_active: 1,
    assigned_at: now,
  });
  await input.deps.history.insert(
    createHistoryEvent({
      leadId,
      eventType: "record_registered",
      actorUserId: input.actorUserId,
      payload: { ruc, toStage: "PENDING_EXTERNAL_REVIEW" },
      occurredAt: now,
    }),
  );
  await input.deps.history.insert(
    createHistoryEvent({
      leadId,
      eventType: "record_assigned",
      actorUserId: input.actorUserId,
      subjectUserId: input.executiveId,
      payload: { executiveId: input.executiveId },
      occurredAt: now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "record_registered",
    "lead",
    leadId,
    { ruc, stage: "PENDING_EXTERNAL_REVIEW" },
  );

  return Ok({ leadId });
}

export async function registerRecord(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
  ruc: string;
}): Promise<Result<{ leadId: number }, DomainError>> {
  return runInPipelineTransaction(async ({ executor }) => {
    return registerRecordWithDeps({
      ...input,
      deps: createPipelineDeps(executor),
      auditService: pipelineAuditService,
      engineGateway: pipelineEngineGateway,
    });
  });
}
