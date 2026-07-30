import { revalidate } from "@solidjs/router";

import { leadDetailQuery } from "~/features/workflow/data/lead-detail.query";
import { leadListQuery } from "~/features/workflow/data/lead-list.query";

export async function revalidateWorkflowLead(leadId: string): Promise<void> {
  await Promise.all([
    revalidate(leadDetailQuery.keyFor(leadId)),
    revalidate(leadListQuery.key),
  ]);
}

export async function revalidateWorkflowLeadList(): Promise<void> {
  await revalidate(leadListQuery.key);
}
