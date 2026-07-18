import { hasPermission } from "~/lib/auth/access/rbac";
import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import type { BranchId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import { validatePendingQuotationLimit } from "~/server/workflow/lead/domain/pending-quotation";

import type { PendingQuotationPolicyRepository } from "../pending-quotation-policy-repo";

export async function updatePendingQuotationPolicy(
  input: {
    actor: WorkflowActor;
    enabled: boolean;
    limit: number;
  },
  ports: {
    pendingQuotationPolicies: PendingQuotationPolicyRepository;
    now: Date;
  },
): Promise<Result<{ branchId: BranchId; clientLimit: number }, DomainError>> {
  if (!hasPermission(input.actor.role, "quotation:policy:manage")) {
    return Err(forbidden());
  }

  // Enabling with a non-positive value is contradictory: disabling is expressed
  // by enabled=false, which stores 0.
  if (input.enabled && input.limit < 1) {
    return Err(fail("invalid_pending_quotation_limit"));
  }

  const target = input.enabled ? input.limit : 0;
  const validated = validatePendingQuotationLimit(target);
  if (!validated.ok) {
    return validated;
  }

  await ports.pendingQuotationPolicies.upsert({
    branchId: input.actor.branchId,
    clientLimit: validated.value,
    updatedAt: ports.now,
    updatedByUserId: input.actor.userId,
  });

  return Ok({
    branchId: input.actor.branchId,
    clientLimit: validated.value,
  });
}
