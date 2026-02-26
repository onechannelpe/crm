import { action, json } from "@solidjs/router";

import { allocateQuota } from "~/actions/quota";
import { quotaStatusQuery } from "~/lib/queries/quota";

export const allocateQuotaMutation = action(
  async (executiveId: number, amount: number) => {
    await allocateQuota(executiveId, amount);
    return json({}, { revalidate: quotaStatusQuery.key });
  },
  "allocateQuota",
);
