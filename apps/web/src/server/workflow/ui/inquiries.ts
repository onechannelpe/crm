import "server-only";

import type { InquiryListView } from "~/contracts/workflow/views";
import { executeSessionServerFunction } from "~/server/platform/action";
import { db } from "~/server/platform/database/db";
import { listInquiriesForExecutive } from "~/server/workflow/inquiry/inquiry-queries";
import { Ok } from "~/shared/result";

import { workflowActor } from "~/server/workflow/ui/actor";

export async function queryMyInquiries(): Promise<InquiryListView> {

  return executeSessionServerFunction({
    name: "workflow.list_inquiries",
    access: { kind: "auth" },

    execute: async ({ actor }) => {
      const { userId } = workflowActor(actor);
      const rows = await listInquiriesForExecutive(db, userId);
      return Ok({ rows });
    },
  });
}
