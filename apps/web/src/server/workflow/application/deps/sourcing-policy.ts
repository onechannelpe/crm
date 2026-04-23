import type { LeadSourcingPolicyRepository } from "../ports/sourcing-policy-repository";

export type SourcingPolicyDeps = {
  sourcingPolicies: LeadSourcingPolicyRepository;
};
