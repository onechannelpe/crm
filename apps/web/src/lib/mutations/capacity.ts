import { action, json } from "@solidjs/router";

import {
  approveCapacity,
  grantMoreLeadRefill,
  grantMoreSearches,
  rejectCapacity,
} from "~/actions/capacity/approvals";
import {
  updateLeadPolicyOverride,
  updateLeadPolicyDefault,
  updateSearchPolicyOverride,
  updateSearchPolicyDefault,
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
import { myContactAssignmentCapacityQuery } from "~/lib/queries/contact-assignment-capacity";
import { activeContactAssignmentsQuery } from "~/lib/queries/contact-assignments";
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
        activeContactAssignmentsQuery.key,
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

export const updateSearchPolicyOverrideMutation = action(
  async (input: {
    userId: string;
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
    userId: string;
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
    scopeId: string;
    monthlySearchLimit: number;
  }) => {
    const result = await updateSearchPolicyDefault(input);
    return json(result, {
      revalidate: [capacityPolicyDefaultsQuery.key, managedExecutivesQuery.key],
    });
  },
  "updateSearchScopeDefault",
);

export const updateLeadScopeDefaultMutation = action(
  async (input: {
    scopeType: "branch" | "team";
    scopeId: string;
    activeBufferTarget: number;
    dailyRefillLimit: number;
  }) => {
    const result = await updateLeadPolicyDefault(input);
    return json(result, {
      revalidate: [capacityPolicyDefaultsQuery.key, managedExecutivesQuery.key],
    });
  },
  "updateLeadScopeDefault",
);
