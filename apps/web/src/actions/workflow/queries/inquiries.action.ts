import type { InquiryListView } from "~/contracts/workflow/views";
import { executeSessionServerFunction } from "~/server/platform/action";
import { getWorkflowRuntime } from "~/server/platform/container/workflow-runtime";
import { listInquiriesForExecutive } from "~/server/workflow/inquiry/inquiry-queries";
import { Ok } from "~/shared/result";

import { workflowActor } from "../commands/actor.action";

export async function queryMyInquiries(): Promise<InquiryListView> {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.list_inquiries",
    access: { kind: "auth" },

    execute: async ({ actor }) => {
      const { userId } = workflowActor(actor);
      const rows = await listInquiriesForExecutive(
        getWorkflowRuntime().ports().executor,
        userId,
      );
      return Ok({ rows });
    },
  });
}
