import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowUserRepository } from "~/server/workflow/lead/read/users-repo";
import type { LeadRepository } from "~/server/workflow/lead/write/lead-repo";

import {
  decideRegistrationConflict,
  ensureCanReassignLead,
} from "../domain/assignment";
import type { LeadState } from "../domain/state";

export type LeadRegistrationResolution =
  | { kind: "create" }
  | { kind: "reassign"; lead: Pick<LeadState, "id"> };

type LookupDeps = {
  leads: LeadRepository;
  users: WorkflowUserRepository;
};

export async function ensureActiveExecutive(input: {
  deps: { users: WorkflowUserRepository };
  executiveId: number;
}): Promise<Result<void, DomainError>> {
  const targetExecutive = await input.deps.users.findById(input.executiveId);
  if (!targetExecutive || !targetExecutive.isActive) {
    return Err(fail("invalid_executive"));
  }

  return Ok(undefined);
}

export async function resolveLeadRegistration(input: {
  deps: LookupDeps;
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
    return Err(fail("ruc_conflict"));
  }

  const canReassign = ensureCanReassignLead({
    currentExecutiveId: existingLead.executiveId,
    newExecutiveId: input.executiveId,
  });
  if (!canReassign.ok) {
    return canReassign;
  }

  return Ok({ kind: "reassign", lead: { id: existingLead.id } });
}
