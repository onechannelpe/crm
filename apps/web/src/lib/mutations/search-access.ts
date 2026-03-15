import { action, json } from "@solidjs/router";

import {
  grantMoreSearches,
  requestMoreSearches,
  updateSearchPolicyOverride,
  updateSearchScopeDefault,
} from "~/actions/search-access/mutations";
import { mySearchAllowanceQuery } from "~/lib/queries/search-access";
import {
  managedExecutivesQuery,
  executiveCapacityDetailQuery,
  salesPolicyDefaultsQuery,
  allowanceRequestsQuery,
} from "~/lib/queries/team-admin";

export const requestMoreSearchesMutation = action(
  async (amount: number, reason: string) => {
    const result = await requestMoreSearches(amount, reason);
    return json(result, {
      revalidate: [mySearchAllowanceQuery.key, allowanceRequestsQuery.key],
    });
  },
  "requestMoreSearches",
);

export const grantMoreSearchesMutation = action(
  async (userId: number, amount: number, reason: string) => {
    const result = await grantMoreSearches(userId, amount, reason);
    return json(result, {
      revalidate: [
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
        allowanceRequestsQuery.key,
      ],
    });
  },
  "grantMoreSearches",
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

export const updateSearchScopeDefaultMutation = action(
  async (input: {
    scopeType: "branch" | "team";
    scopeId: number;
    monthlySearchLimit: number;
  }) => {
    const result = await updateSearchScopeDefault(input);
    return json(result, {
      revalidate: [salesPolicyDefaultsQuery.key, managedExecutivesQuery.key],
    });
  },
  "updateSearchScopeDefault",
);
