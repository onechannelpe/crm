import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, type Result } from "~/server/shared/result";

import { createLeadDraft, normalizeLeadRuc } from "../../domain/lead";
import type { LeadAssignmentRepository } from "../ports/assignment-repository";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineEngineGateway } from "../ports/engine-gateway";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";
import type { PipelineUserRepository } from "../ports/user-repository";
import {
  ensureActiveExecutive,
  resolveLeadRegistration,
} from "./register-lead-resolution";
import {
  createRegisteredLead,
  reassignExistingLeadOnRegistration,
} from "./register-lead-writer";

type RegisterLeadDeps = {
  leads: LeadRepository;
  leadAssignments: LeadAssignmentRepository;
  leadHistory: LeadHistoryRepository;
  users: PipelineUserRepository;
};

export async function registerLead(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
  ruc: string;
  deps: RegisterLeadDeps;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
}): Promise<Result<{ leadId: number }, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
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
    return reassignExistingLeadOnRegistration({
      deps: input.deps,
      auditService: input.auditService,
      actorUserId: input.actorUserId,
      executiveId: input.executiveId,
      lead: resolution.value.lead,
      now,
    });
  }

  const enrichment = await input.engineGateway.enrichByRuc(ruc.value);
  const draft = createLeadDraft({
    ruc: ruc.value,
    razonSocial: enrichment?.razonSocial ?? null,
    address: enrichment?.address ?? null,
    executiveId: input.executiveId,
    now,
  });
  if (!draft.ok) {
    return draft;
  }

  return createRegisteredLead({
    deps: input.deps,
    auditService: input.auditService,
    actorUserId: input.actorUserId,
    executiveId: input.executiveId,
    draft: draft.value,
    now,
  });
}
