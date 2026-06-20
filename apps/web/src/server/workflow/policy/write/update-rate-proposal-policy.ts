import { hasPermission } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RateProposalPolicyRepository } from "~/server/workflow/infrastructure/ports/entities";
import { validateRateProposalValidityDays } from "~/server/workflow/lead/domain/pricing";
import type { UpdateRateProposalPolicyCommandInput } from "~/server/workflow/types";

export async function updateRateProposalPolicy(
  input: UpdateRateProposalPolicyCommandInput,
  ports: { rateProposalPolicies: RateProposalPolicyRepository; now: number },
): Promise<Result<{ branchId: number; validityDays: number }, DomainError>> {
  if (!hasPermission(input.actor.role, "quotation:policy:manage")) {
    return Err(forbidden());
  }

  const validityDays = validateRateProposalValidityDays(input.validityDays);
  if (!validityDays.ok) return validityDays;

  await ports.rateProposalPolicies.upsert({
    branchId: input.actor.branchId,
    validityDays: validityDays.value,
    updatedAt: ports.now,
    updatedByUserId: input.actor.userId,
  });

  return Ok({
    branchId: input.actor.branchId,
    validityDays: validityDays.value,
  });
}
