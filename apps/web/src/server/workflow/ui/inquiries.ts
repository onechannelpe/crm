import "server-only";
import type { InquiryListView } from "~/contracts/workflow/views";
import { executeSessionServerFunction } from "~/server/platform/action";
import { workflowActor } from "~/server/workflow/ui/actor";
import { workflow } from "~/server/workflow/ui/composition";
import { Ok } from "~/shared/result";

export async function queryMyInquiries(): Promise<InquiryListView> {
  return executeSessionServerFunction({
    name: "workflow.list_inquiries",
    access: { kind: "auth" },

    execute: async ({ actor }) => {
      const { userId } = workflowActor(actor);
      const rows = await workflow.queries.listInquiriesForExecutive(userId);
      return Ok({ rows });
    },
  });
}
