"use server";

import { getRecordDetail } from "~/server/pipeline/application/queries/get-record-detail";
import { listRecords } from "~/server/pipeline/application/queries/list-records";
import { runAction } from "~/server/shared/action-runtime";

export async function queryRecordList(filters: {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  limit?: number;
  offset?: number;
}) {
  return runAction({
    actionName: "pipeline.list_records",
    requireAuth: true,
    input: filters,
    execute: (ctx) =>
      listRecords({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function queryRecordDetail(leadId: number) {
  return runAction({
    actionName: "pipeline.get_record_detail",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      getRecordDetail({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}
