import { action, json } from "@solidjs/router";

import {
  approveAllowanceRequest,
  rejectAllowanceRequest,
} from "~/actions/team-admin/mutations";
import {
  allowanceRequestsQuery,
  executiveCapacityDetailQuery,
  managedExecutivesQuery,
} from "~/lib/queries/team-admin";

export const approveAllowanceRequestMutation = action(
  async (requestId: number, note?: string) => {
    const result = await approveAllowanceRequest(requestId, note);
    return json(result, {
      revalidate: [
        allowanceRequestsQuery.key,
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
      ],
    });
  },
  "approveAllowanceRequest",
);

export const rejectAllowanceRequestMutation = action(
  async (requestId: number, note: string) => {
    const result = await rejectAllowanceRequest(requestId, note);
    return json(result, {
      revalidate: [
        allowanceRequestsQuery.key,
        managedExecutivesQuery.key,
        executiveCapacityDetailQuery.key,
      ],
    });
  },
  "rejectAllowanceRequest",
);
