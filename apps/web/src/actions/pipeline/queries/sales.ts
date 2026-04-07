"use server";

import type { SaleView } from "~/actions/pipeline/contracts";
import { getSaleDetail } from "~/server/pipeline/application/queries/get-sale-detail";
import { listSales } from "~/server/pipeline/application/queries/list-sales";
import { createPipelineQueryRuntime } from "~/server/pipeline/infrastructure/query-runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function querySales(filters: {
  limit?: number;
  offset?: number;
}): Promise<SaleView[]> {
  const result = await runAction({
    actionName: "pipeline.list_sales",
    requireAuth: true,
    input: filters,
    execute: (ctx) =>
      listSales(createPipelineQueryRuntime().deps.saleQueries, {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        ...filters,
      }),
  });

  return result;
}

export async function querySaleDetail(saleId: number): Promise<SaleView> {
  return runAction({
    actionName: "pipeline.get_sale_detail",
    requireAuth: true,
    input: { saleId },
    execute: (ctx) =>
      getSaleDetail(createPipelineQueryRuntime().deps.saleQueries, {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        saleId,
      }),
  });
}
