import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  DEFAULT_RATE_PROPOSAL_VALIDITY_DAYS,
  resolveRateProposalPolicy,
} from "../../domain/pricing-policy";
import type { RateProposalPolicyRepository } from "../ports/entities";

export type RateProposalPolicyView = {
  branchId: number;
  validityDays: number;
  defaultValidityDays: number;
  updatedAt: number | null;
  updatedByUserId: number | null;
};

export async function getRateProposalPolicy(
  deps: {
    rateProposalPolicies: RateProposalPolicyRepository;
  },
  input: {
    actorRole: Role;
    branchId: number;
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
    updatedAt: current?.updatedAt ?? null,
    updatedByUserId: current?.updatedByUserId ?? null,
  });
}
