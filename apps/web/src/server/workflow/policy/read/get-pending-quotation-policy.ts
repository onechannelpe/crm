import { hasPermission, type Role } from "~/domain/auth/access/rbac";
import { forbidden, type DomainError } from "~/domain/errors";
import type { BranchId } from "~/domain/ids";
import {
  resolvePendingQuotationPolicy,
  SUGGESTED_PENDING_QUOTATION_LIMIT,
} from "~/server/workflow/lead/domain/pending-quotation";
import { Err, Ok, type Result } from "~/shared/result";

import type { PendingQuotationPolicyRepository } from "../pending-quotation-policy-repo";

export type PendingQuotationPolicyView = {
  branchId: string;
  enabled: boolean;
  limit: number;
  updatedAt: number | null;
  updatedByUserId: string | null;
};

export async function getPendingQuotationPolicy(
  deps: {
    pendingQuotationPolicies: PendingQuotationPolicyRepository;
  },
  input: {
    actorRole: Role;
    branchId: BranchId;
  },
): Promise<Result<PendingQuotationPolicyView, DomainError>> {
  if (!hasPermission(input.actorRole, "quotation:policy:manage")) {
    return Err(forbidden());
  }

  const current = await deps.pendingQuotationPolicies.findByBranchId(
    input.branchId,
  );
  const resolved = resolvePendingQuotationPolicy({ branchPolicy: current });

  return Ok({
    branchId: input.branchId,
    enabled: resolved.limit !== null,
    limit: resolved.limit ?? SUGGESTED_PENDING_QUOTATION_LIMIT,
    updatedAt: current?.updatedAt.getTime() ?? null,
    updatedByUserId: current?.updatedByUserId ?? null,
  });
}
