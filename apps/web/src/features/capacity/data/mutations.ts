import { action, json } from "@solidjs/router";

import {
  approveCapacity,
  grantMoreLeadRefill,
  grantMoreSearches,
  rejectCapacity,
} from "~/actions/capacity/approvals.action";
import {
  updateExecutivePolicyOverride,
  updateScopePolicy,
} from "~/actions/capacity/policies.action";
import {
  requestMoreLeadRefill,
  requestMoreSearches,
} from "~/actions/capacity/requests.action";
import {
  capacityPolicyDefaultsQuery,
  executiveCapacityDetailQuery,
  managedExecutivesQuery,
  myContactAssignmentCapacityQuery,
  mySearchAllowanceQuery,
  pendingCapacityRequestsQuery,
} from "~/features/capacity/data/queries";

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
