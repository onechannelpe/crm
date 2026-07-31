import { action, json } from "@solidjs/router";

import {
  approveCapacity,
  grantMoreLeadRefill,
  grantMoreSearches,
  rejectCapacity,
} from "~/rpc/capacity/approvals.action";
import { capacityPolicyDefaultsQuery } from "~/rpc/capacity/capacity-policy-defaults.query";
import { executiveCapacityDetailQuery } from "~/rpc/capacity/executive-capacity-detail.query";
import { managedExecutivesQuery } from "~/rpc/capacity/managed-executives.query";
import { myContactAssignmentCapacityQuery } from "~/rpc/capacity/my-contact-assignment-capacity.query";
import { mySearchAllowanceQuery } from "~/rpc/capacity/my-search-allowance.query";
import { pendingCapacityRequestsQuery } from "~/rpc/capacity/pending-capacity-requests.query";
import {
  updateExecutivePolicyOverride,
  updateScopePolicy,
} from "~/rpc/capacity/policies.action";
import {
  requestMoreLeadRefill,
  requestMoreSearches,
} from "~/rpc/capacity/requests.action";

export const requestMoreSearchesMutation = action(
  async (amount: number, reason: string) => {
    const result = await requestMoreSearches(amount, reason);
    return json(result, {
      revalidate: [
        mySearchAllowanceQuery.key,
        pendingCapacityRequestsQuery.key,
      ],
    });
  },
  "requestMoreSearches",
);

export const requestMoreLeadRefillMutation = action(
  async (amount: number, reason: string) => {
    const result = await requestMoreLeadRefill(amount, reason);
    return json(result, {
      revalidate: [
        myContactAssignmentCapacityQuery.key,
        pendingCapacityRequestsQuery.key,
      ],
    });
  },
  "requestMoreLeadRefill",
);

export const approveCapacityRequestMutation = action(
  async (requestId: string, note?: string) => {
    const result = await approveCapacity(requestId, note);
    return json(result, {
      revalidate: [
        pendingCapacityRequestsQuery.key,
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
        mySearchAllowanceQuery.key,
        myContactAssignmentCapacityQuery.key,
      ],
    });
  },
  "approveCapacityRequest",
);

export const rejectCapacityRequestMutation = action(
  async (requestId: string, note: string) => {
    const result = await rejectCapacity(requestId, note);
    return json(result, {
      revalidate: [
        pendingCapacityRequestsQuery.key,
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
      ],
    });
  },
  "rejectCapacityRequest",
);

export const grantMoreSearchesMutation = action(
  async (userId: string, amount: number, reason: string) => {
    const result = await grantMoreSearches(userId, amount, reason);
    return json(result, {
      revalidate: [
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
        pendingCapacityRequestsQuery.key,
      ],
    });
  },
  "grantMoreSearches",
);

export const grantMoreLeadRefillMutation = action(
  async (userId: string, amount: number, reason: string) => {
    const result = await grantMoreLeadRefill(userId, amount, reason);
    return json(result, {
      revalidate: [
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
        pendingCapacityRequestsQuery.key,
      ],
    });
  },
  "grantMoreLeadRefill",
);

export const updateExecutivePolicyOverrideMutation = action(
  async (input: {
    userId: string;
    monthlySearchLimit: number;
    activeBufferTarget: number;
    dailyRefillLimit: number;
    expiresAt: number | null;
  }) => {
    const result = await updateExecutivePolicyOverride(input);
    return json(result, {
      revalidate: [
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
      ],
    });
  },
  "updateExecutivePolicyOverride",
);

export const updateScopePolicyMutation = action(
  async (input: {
    scopeType: "branch" | "team";
    scopeId: string;
    monthlySearchLimit: number;
    activeBufferTarget: number;
    dailyRefillLimit: number;
  }) => {
    const result = await updateScopePolicy(input);
    return json(result, {
      revalidate: [capacityPolicyDefaultsQuery.key, managedExecutivesQuery.key],
    });
  },
  "updateScopePolicy",
);
