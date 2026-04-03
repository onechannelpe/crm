"use server";

import { getSaleDetail } from "~/server/pipeline/application/queries/get-sale-detail";
import { listSales } from "~/server/pipeline/application/queries/list-sales";
import { createSaleQueryDeps } from "~/server/pipeline/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

export async function querySales(filters: { limit?: number; offset?: number }) {
  return runAction({
    actionName: "pipeline.list_sales",
    requireAuth: true,
    input: filters,
    execute: (ctx) =>
      listSales(createSaleQueryDeps(), {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        ...filters,
      }),
  });
}

export async function querySaleDetail(saleId: number) {
  return runAction({
    actionName: "pipeline.get_sale_detail",
    requireAuth: true,
    input: { saleId },
    execute: (ctx) =>
      getSaleDetail(createSaleQueryDeps(), {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        saleId,
      }),
  });
}
