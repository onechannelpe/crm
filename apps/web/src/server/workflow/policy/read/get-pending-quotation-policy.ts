import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import type { BranchId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import {
  resolvePendingQuotationPolicy,
  SUGGESTED_PENDING_QUOTATION_LIMIT,
} from "~/server/workflow/lead/domain/pending-quotation";

import type { PendingQuotationPolicyRepository } from "../pending-quotation-policy-repo";

export type PendingQuotationPolicyView = {
  branchId: string;
  // Whether the cap is enforced. When false, executives register without limit.
  enabled: boolean;
  // The cap to show in the editor. When disabled, falls back to the suggested
  // value so re-enabling starts from a sensible number.
  limit: number;
  suggestedLimit: number;
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
    suggestedLimit: SUGGESTED_PENDING_QUOTATION_LIMIT,
    updatedAt: current?.updatedAt.getTime() ?? null,
    updatedByUserId: current?.updatedByUserId ?? null,
  });
}
