import { hasPermission } from "~/domain/auth/access/rbac";
import { fail, forbidden, type DomainError } from "~/domain/errors";
import type { BranchId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import { validatePendingQuotationLimit } from "~/server/workflow/lead/domain/pending-quotation";
import { Err, Ok, type Result } from "~/shared/result";

import type { PendingQuotationPolicyRepository } from "../pending-quotation-policy-repo";

export async function updatePendingQuotationPolicy(
  input: {
    actor: WorkflowActor;
  } & ({ enabled: false } | { enabled: true; limit: number }),
  ports: {
    pendingQuotationPolicies: PendingQuotationPolicyRepository;
    now: Date;
  },
): Promise<Result<{ branchId: BranchId; clientLimit: number }, DomainError>> {
  if (!hasPermission(input.actor.role, "quotation:policy:manage")) {
    return Err(forbidden());
  }

  // Zero disables the policy; an enabled policy requires a positive limit.
  if (input.enabled && input.limit < 1) {
    return Err(fail("invalid_pending_quotation_limit"));
  }

  const targetLimit = input.enabled ? input.limit : 0;
  const validatedLimit = validatePendingQuotationLimit(targetLimit);

  if (!validatedLimit.ok) {
    return validatedLimit;
  }

  await ports.pendingQuotationPolicies.upsert({
    branchId: input.actor.branchId,
    clientLimit: validatedLimit.value,
    updatedAt: ports.now,
    updatedByUserId: input.actor.userId,
  });

  return Ok({
    branchId: input.actor.branchId,
    clientLimit: validatedLimit.value,
  });
}
