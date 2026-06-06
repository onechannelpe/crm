import { revalidate } from "@solidjs/router";

import { leadDetailQuery, leadListQuery } from "./queries";

export async function revalidateWorkflowLead(leadId: string): Promise<void> {
  await Promise.all([
    revalidate(leadDetailQuery.keyFor(leadId)),
    revalidate(leadListQuery.key),
  ]);
}

export async function revalidateWorkflowLeadList(): Promise<void> {
  await revalidate(leadListQuery.key);
}
