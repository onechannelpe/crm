import { hasPermission } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { UpdateRateProposalPolicyCommandInput } from "~/server/workflow/types";

import { validateRateProposalValidityDays } from "../../domain/pricing-policy";
import type { RateProposalPolicyRepository } from "../ports/entities";

export async function updateRateProposalPolicy(
  input: UpdateRateProposalPolicyCommandInput,
  ports: { rateProposalPolicies: RateProposalPolicyRepository },
): Promise<Result<{ branchId: number; validityDays: number }, DomainError>> {
  if (!hasPermission(input.actor.role, "quotation:policy:manage")) {
    return Err(forbidden());
  }

  const validityDays = validateRateProposalValidityDays(input.validityDays);
  if (!validityDays.ok) return validityDays;

  await ports.rateProposalPolicies.upsert({
    branchId: input.actor.branchId,
    validityDays: validityDays.value,
    updatedAt: Date.now(),
    updatedByUserId: input.actor.userId,
  });

  return Ok({
    branchId: input.actor.branchId,
    validityDays: validityDays.value,
  });
}
