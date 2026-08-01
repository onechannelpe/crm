import { hasPermission } from "~/domain/auth/access/rbac";
import { forbidden, type DomainError } from "~/domain/errors";
import type { BranchId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import { validateRateProposalValidityDays } from "~/server/workflow/lead/domain/pricing";
import { Err, Ok, type Result } from "~/shared/result";

import type { RateProposalPolicyRepository } from "../rate-proposal-policy-repo";

export async function updateRateProposalPolicy(
  input: {
    actor: WorkflowActor;
    validityDays: number;
  },
  rateProposalPolicies: RateProposalPolicyRepository,
  updatedAt: Date,
): Promise<Result<{ branchId: BranchId; validityDays: number }, DomainError>> {
  if (!hasPermission(input.actor.role, "quotation:policy:manage")) {
    return Err(forbidden());
  }

  const parsedValidityDays = validateRateProposalValidityDays(
    input.validityDays,
  );

  if (!parsedValidityDays.ok) {
    return parsedValidityDays;
  }

  await rateProposalPolicies.upsert({
    branchId: input.actor.branchId,
    validityDays: parsedValidityDays.value,
    updatedAt,
    updatedByUserId: input.actor.userId,
  });

  return Ok({
    branchId: input.actor.branchId,
    validityDays: parsedValidityDays.value,
  });
}
