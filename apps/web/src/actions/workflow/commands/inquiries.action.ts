"use server";

import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getWorkflowRuntime } from "~/server/platform/container/workflow-runtime";
import { createInquiry } from "~/server/workflow/inquiry/create-inquiry";

import { workflowActor } from "./actor";

export async function requestInquiryCreation(input: unknown) {
  return executeSessionServerFunction({
    name: "workflow.create_inquiry",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        ruc: r.str("ruc"),
      })),

    execute: ({ actor }, payload) =>
      createInquiry(
        { ruc: payload.ruc, actor: workflowActor(actor) },
        getWorkflowRuntime().ports(),
      ),
  });
}
