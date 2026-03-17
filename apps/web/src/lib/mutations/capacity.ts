import { action, json } from "@solidjs/router";

import {
  approveCapacity,
  grantMoreLeadRefill,
  grantMoreSearches,
  rejectCapacity,
} from "~/actions/capacity/approvals";
import {
  updateLeadPolicyOverride,
  updateLeadScopeDefault_,
  updateSearchPolicyOverride,
  updateSearchScopeDefault_,
} from "~/actions/capacity/policies";
import {
  requestMoreLeadRefill,
  requestMoreSearches,
} from "~/actions/capacity/requests";
import {
  capacityPolicyDefaultsQuery,
  executiveCapacityDetailQuery,
  managedExecutivesQuery,
  pendingCapacityRequestsQuery,
} from "~/lib/queries/capacity";
import { myLeadCapacityQuery } from "~/lib/queries/lead-operations";
import { activeLeadsQuery } from "~/lib/queries/leads";
import { mySearchAllowanceQuery } from "~/lib/queries/search";

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
      revalidate: [myLeadCapacityQuery.key, pendingCapacityRequestsQuery.key],
    });
  },
  "requestMoreLeadRefill",
);

export const approveCapacityRequestMutation = action(
  async (requestId: number, note?: string) => {
    const result = await approveCapacity(requestId, note);
    return json(result, {
      revalidate: [
        pendingCapacityRequestsQuery.key,
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
        mySearchAllowanceQuery.key,
        myLeadCapacityQuery.key,
        activeLeadsQuery.key,
      ],
    });
  },
  "approveCapacityRequest",
);

export const rejectCapacityRequestMutation = action(
  async (requestId: number, note: string) => {
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
  async (userId: number, amount: number, reason: string) => {
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
  async (userId: number, amount: number, reason: string) => {
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

export const updateSearchPolicyOverrideMutation = action(
  async (input: {
    userId: number;
    monthlySearchLimit: number;
    expiresAt: number | null;
  }) => {
    const result = await updateSearchPolicyOverride(input);
    return json(result, {
      revalidate: [
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
      ],
    });
  },
  "updateSearchPolicyOverride",
);

export const updateLeadPolicyOverrideMutation = action(
  async (input: {
    userId: number;
    activeBufferTarget: number;
    dailyRefillLimit: number;
    expiresAt: number | null;
  }) => {
    const result = await updateLeadPolicyOverride(input);
    return json(result, {
      revalidate: [
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
      ],
    });
  },
  "updateLeadPolicyOverride",
);

export const updateSearchScopeDefaultMutation = action(
  async (input: {
    scopeType: "branch" | "team";
    scopeId: number;
    monthlySearchLimit: number;
  }) => {
    const result = await updateSearchScopeDefault_(input);
    return json(result, {
      revalidate: [capacityPolicyDefaultsQuery.key, managedExecutivesQuery.key],
    });
  },
  "updateSearchScopeDefault",
);

export const updateLeadScopeDefaultMutation = action(
  async (input: {
    scopeType: "branch" | "team";
    scopeId: number;
    activeBufferTarget: number;
    dailyRefillLimit: number;
  }) => {
    const result = await updateLeadScopeDefault_(input);
    return json(result, {
      revalidate: [capacityPolicyDefaultsQuery.key, managedExecutivesQuery.key],
    });
  },
  "updateLeadScopeDefault",
);
