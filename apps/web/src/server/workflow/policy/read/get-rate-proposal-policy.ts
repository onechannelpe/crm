import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import type { BranchId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import {
  DEFAULT_RATE_PROPOSAL_VALIDITY_DAYS,
  resolveRateProposalPolicy,
} from "~/server/workflow/lead/domain/pricing";

import type { RateProposalPolicyRepository } from "../rate-proposal-policy-repo";

export type RateProposalPolicyView = {
  branchId: string;
  validityDays: number;
  defaultValidityDays: number;
  updatedAt: number | null;
  updatedByUserId: string | null;
};

export async function getRateProposalPolicy(
  deps: {
    rateProposalPolicies: RateProposalPolicyRepository;
  },
  input: {
    actorRole: Role;
    branchId: BranchId;
  },
): Promise<Result<RateProposalPolicyView, DomainError>> {
  if (!hasPermission(input.actorRole, "quotation:policy:manage")) {
    return Err(forbidden());
  }

  const current = await deps.rateProposalPolicies.findByBranchId(
    input.branchId,
  );
  const policy = resolveRateProposalPolicy({ branchPolicy: current });

  return Ok({
    branchId: input.branchId,
    validityDays: policy.validityDays,
    defaultValidityDays: DEFAULT_RATE_PROPOSAL_VALIDITY_DAYS,
    updatedAt: current?.updatedAt.getTime() ?? null,
    updatedByUserId: current?.updatedByUserId ?? null,
  });
}
