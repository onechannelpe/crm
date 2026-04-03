"use server";

import { getSaleDetail } from "~/server/pipeline/application/queries/get-sale-detail";
import { listSales } from "~/server/pipeline/application/queries/list-sales";
import { createSaleQueryDeps } from "~/server/pipeline/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

import { createPipelineQueryRuntime } from "../runtime/queries";

export async function querySales(filters: { limit?: number; offset?: number }) {
  return runAction({
    actionName: "pipeline.list_sales",
    permission: "lead:register",
    input: filters,
    execute: (ctx) =>
      listSales(createPipelineQueryRuntime(createSaleQueryDeps), {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        ...filters,
      }),
  });
}

export async function querySaleDetail(saleId: number) {
  return runAction({
    actionName: "pipeline.get_sale_detail",
    permission: "lead:register",
    input: { saleId },
    execute: (ctx) =>
      getSaleDetail(createPipelineQueryRuntime(createSaleQueryDeps), {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        saleId,
      }),
  });
}
