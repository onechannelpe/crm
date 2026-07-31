import { revalidate } from "@solidjs/router";

import { leadDetailQuery } from "~/rpc/workflow/lead-detail.query";
import { leadListQuery } from "~/rpc/workflow/lead-list.query";

export async function revalidateWorkflowLead(leadId: string): Promise<void> {
  await Promise.all([
    revalidate(leadDetailQuery.keyFor(leadId)),
    revalidate(leadListQuery.key),
  ]);
}

export async function revalidateWorkflowLeadList(): Promise<void> {
  await revalidate(leadListQuery.key);
}
