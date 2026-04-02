import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, type Result } from "~/server/shared/result";

import { createLeadDraft } from "../../domain/lead";
import type {
  LeadAssignmentRepository,
  LeadHistoryRepository,
  LeadRepository,
  PipelineAuditService,
  PipelineEngineGateway,
  PipelineUserRepository,
} from "../ports";
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

  const ruc = input.ruc.trim();
  if (!ruc) {
    return Err(domainError("validation", "invalid_ruc", "RUC is required"));
  }

  const enrichment = await input.engineGateway.enrichByRuc(ruc);
  const now = Date.now();
  const draft = createLeadDraft({
    ruc,
    razonSocial: enrichment?.razonSocial ?? null,
    address: enrichment?.address ?? null,
    executiveId: input.executiveId,
    now,
  });
  if (!draft.ok) {
    return draft;
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
    ruc,
    executiveId: input.executiveId,
  });
  if (!resolution.ok) {
    return resolution;
  }

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

  return createRegisteredLead({
    deps: input.deps,
    auditService: input.auditService,
    actorUserId: input.actorUserId,
    executiveId: input.executiveId,
    draft: draft.value,
    now,
  });
}
