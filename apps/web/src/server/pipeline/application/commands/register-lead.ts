import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import { createLeadDraft } from "../../domain/lead-record";
import { normalizeLeadRuc } from "../../domain/lead-schema-parser";
import type { RegisterLeadDeps } from "../deps/register-lead";
import {
  canRegisterLead,
  requirePipelineActionAccess,
} from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineEngineGateway } from "../ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../ports/enrichment-queue";
import { writeLeadReassignmentEffects } from "./reassign-lead-effects";
import { writeLeadRegistrationEffects } from "./register-lead-effects";
import {
  ensureActiveExecutive,
  resolveLeadRegistration,
} from "./register-lead-resolution";

export async function registerLead(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
  ruc: string;
  deps: RegisterLeadDeps;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
}): Promise<Result<{ leadId: number }, DomainError>> {
  const canRegister = requirePipelineActionAccess(
    input.actorRole,
    canRegisterLead,
  );
  if (!canRegister.ok) {
    return canRegister;
  }

  const ruc = normalizeLeadRuc(input.ruc);
  if (!ruc.ok) {
    return ruc;
  }

  const activeExecutive = await ensureActiveExecutive({
    deps: input.deps,
    executiveId: input.executiveId,
  });
  if (!activeExecutive.ok) {
    return activeExecutive;
  }

  const resolution = await resolveLeadRegistration({
    deps: input.deps,
    ruc: ruc.value,
    executiveId: input.executiveId,
  });
  if (!resolution.ok) {
    return resolution;
  }

  const now = Date.now();
  if (resolution.value.kind === "reassign") {
    return writeLeadReassignmentEffects({
      deps: input.deps,
      auditService: input.auditService,
      actorUserId: input.actorUserId,
      executiveId: input.executiveId,
      lead: resolution.value.lead,
      now,
      reason: "inactive_previous_executive",
    });
  }

  const enrichment = await input.engineGateway.enrichByRuc(ruc.value);
  const draft = createLeadDraft({
    ruc: ruc.value,
    razonSocial: enrichment?.razonSocial ?? null,
    address: enrichment?.address ?? null,
    executiveId: input.executiveId,
    createdBy: input.actorUserId,
    now,
  });
  if (!draft.ok) {
    return draft;
  }

  const result = await writeLeadRegistrationEffects({
    deps: input.deps,
    auditService: input.auditService,
    actorUserId: input.actorUserId,
    executiveId: input.executiveId,
    draft: draft.value,
    now,
  });
  if (!result.ok) {
    return result;
  }

  await input.leadEnrichmentQueue.enqueueRucVerification(
    ruc.value,
    input.actorUserId,
  );

  return result;
}
