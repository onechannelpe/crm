import type { InquiryListView } from "~/contracts/workflow/views";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import { workflowActor } from "~/server/workflow/ui/actor";
import { Ok } from "~/shared/result";

export async function queryMyInquiries(): Promise<InquiryListView> {
  return executeSessionServerFunction({
    name: "application.workflow.list_inquiries",
    access: { kind: "auth" },

    execute: async ({ actor }) => {
      const { userId } = workflowActor(actor);
      const rows =
        await application.workflow.queries.listInquiriesForExecutive(userId);
      return Ok({ rows });
    },
  });
}
