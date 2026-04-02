import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  decideRegistrationConflict,
  ensureCanReassignLead,
} from "../../domain/assignment";
import type { createPipelineDeps } from "../../infrastructure/deps";

type PipelineCommandDeps = ReturnType<typeof createPipelineDeps>;
export type ExistingLead = NonNullable<
  Awaited<ReturnType<PipelineCommandDeps["leads"]["findByRuc"]>>
>;

export type LeadRegistrationResolution =
  | { kind: "create" }
  | { kind: "reassign"; lead: ExistingLead };

export async function ensureActiveExecutive(input: {
  deps: PipelineCommandDeps;
  executiveId: number;
}): Promise<Result<void, DomainError>> {
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

  return Ok(undefined);
}

export async function resolveLeadRegistration(input: {
  deps: PipelineCommandDeps;
  ruc: string;
  executiveId: number;
}): Promise<Result<LeadRegistrationResolution, DomainError>> {
  const existingLead = await input.deps.leads.findByRuc(input.ruc);
  if (!existingLead) {
    return Ok({ kind: "create" });
  }

  const existingExecutive = await input.deps.users.findById(
    existingLead.executive_id,
  );
  const decision = decideRegistrationConflict({
    existingStage: existingLead.stage,
    hasActiveExecutive: existingExecutive?.is_active === 1,
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
    currentExecutiveId: existingLead.executive_id,
    newExecutiveId: input.executiveId,
  });
  if (!canReassign.ok) {
    return canReassign;
  }

  return Ok({ kind: "reassign", lead: existingLead });
}
