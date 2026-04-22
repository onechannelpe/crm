"use server";

import { getSaleDetail } from "~/server/pipeline/application/queries/get-sale-detail";
import { listSales } from "~/server/pipeline/application/queries/list-sales";
import type { SaleView } from "~/server/pipeline/application/queries/views/sale";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function querySales(filters: {
  limit?: number;
  offset?: number;
}): Promise<SaleView[]> {
  return runAction({
    actionName: "pipeline.list_sales",
    access: { kind: "auth" },
    input: filters,
    execute: (ctx) =>
      listSales(getServerRuntime().pipeline.deps.saleQueries, {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        ...filters,
      }),
  });
}

export async function querySaleDetail(saleId: number): Promise<SaleView> {
  return runAction({
    actionName: "pipeline.get_sale_detail",
    access: { kind: "auth" },
    input: { saleId },
    execute: (ctx) =>
      getSaleDetail(getServerRuntime().pipeline.deps.saleQueries, {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        saleId,
      }),
  });
}
