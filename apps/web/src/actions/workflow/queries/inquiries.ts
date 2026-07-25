"use server";

import type { InquiryListView } from "~/contracts/workflow/views";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { listInquiriesForExecutive } from "~/server/workflow/inquiry/inquiry-queries";
import { Ok } from "~/shared/result";

import { workflowActor } from "../commands/actor";

export async function queryMyInquiries(): Promise<InquiryListView> {
  return runAction({
    name: "workflow.list_inquiries",
    access: { kind: "auth" },

    execute: async ({ actor }) => {
      const { userId } = workflowActor(actor);
      const rows = await listInquiriesForExecutive(
        getServerRuntime().workflow.ports().executor,
        userId,
      );
      return Ok({ rows });
    },
  });
}
