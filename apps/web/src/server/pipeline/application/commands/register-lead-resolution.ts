import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  decideRegistrationConflict,
  ensureCanReassignLead,
} from "../../domain/assignment";
import type { Lead } from "../../domain/lead";
import type {
  ActiveExecutiveDeps,
  LeadRegistrationLookupDeps,
} from "../deps/register-lead";

export type ExistingLead = Lead;

export type LeadRegistrationResolution =
  | { kind: "create" }
  | { kind: "reassign"; lead: ExistingLead };

export async function ensureActiveExecutive(input: {
  deps: ActiveExecutiveDeps;
  executiveId: number;
}): Promise<Result<void, DomainError>> {
  const targetExecutive = await input.deps.users.findById(input.executiveId);
  if (!targetExecutive || !targetExecutive.isActive) {
    return Err(
      domainError(
        "validation",
        "invalid_executive",
        "Target executive not found or inactive",
      ),
    );
  }

  return Ok(undefined);
}

export async function resolveLeadRegistration(input: {
  deps: LeadRegistrationLookupDeps;
  ruc: string;
  executiveId: number;
}): Promise<Result<LeadRegistrationResolution, DomainError>> {
  const existingLead = await input.deps.leads.findByRuc(input.ruc);
  if (!existingLead) {
    return Ok({ kind: "create" });
  }

  const existingExecutive = await input.deps.users.findById(
    existingLead.executiveId,
  );
  const decision = decideRegistrationConflict({
    existingStage: existingLead.stage,
    hasActiveExecutive: existingExecutive?.isActive === true,
  });

  if (decision === "conflict") {
    return Err(
      domainError(
        "conflict",
        "ruc_conflict",
        "A lead with this RUC already exists",
      ),
    );
  }

  const canReassign = ensureCanReassignLead({
    currentExecutiveId: existingLead.executiveId,
    newExecutiveId: input.executiveId,
  });
  if (!canReassign.ok) {
    return canReassign;
  }

  return Ok({ kind: "reassign", lead: existingLead });
}
