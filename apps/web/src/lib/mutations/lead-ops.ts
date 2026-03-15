import { action, json } from "@solidjs/router";

import {
  grantMoreLeadRefill,
  requestLeadRefillNow,
  requestMoreLeadRefill,
  updateLeadPolicyOverride,
  updateLeadScopeDefault,
} from "~/actions/lead-ops/mutations";
import { myLeadCapacityQuery } from "~/lib/queries/lead-ops";
import { allowanceRequestsQuery, executiveCapacityDetailQuery, managedExecutivesQuery, salesPolicyDefaultsQuery } from "~/lib/queries/team-admin";
import { activeLeadsQuery } from "~/lib/queries/leads";

export const requestLeadRefillNowMutation = action(async () => {
  const result = await requestLeadRefillNow();
  return json(result, {
    revalidate: [activeLeadsQuery.key, myLeadCapacityQuery.key, managedExecutivesQuery.key],
  });
}, "requestLeadRefillNow");

export const requestMoreLeadRefillMutation = action(
  async (amount: number, reason: string) => {
    const result = await requestMoreLeadRefill(amount, reason);
    return json(result, { revalidate: [allowanceRequestsQuery.key, myLeadCapacityQuery.key] });
  },
  "requestMoreLeadRefill",
);

export const grantMoreLeadRefillMutation = action(
  async (userId: number, amount: number, reason: string) => {
    const result = await grantMoreLeadRefill(userId, amount, reason);
    return json(result, {
      revalidate: [
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
        allowanceRequestsQuery.key,
      ],
    });
  },
  "grantMoreLeadRefill",
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
      revalidate: [managedExecutivesQuery.key, executiveCapacityDetailQuery.key],
    });
  },
  "updateLeadPolicyOverride",
);

export const updateLeadScopeDefaultMutation = action(
  async (input: {
    scopeType: "branch" | "team";
    scopeId: number;
    activeBufferTarget: number;
    dailyRefillLimit: number;
  }) => {
    const result = await updateLeadScopeDefault(input);
    return json(result, {
      revalidate: [salesPolicyDefaultsQuery.key, managedExecutivesQuery.key],
    });
  },
  "updateLeadScopeDefault",
);
