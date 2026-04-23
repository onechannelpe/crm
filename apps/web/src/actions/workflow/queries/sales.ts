"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { getSaleDetail } from "~/server/workflow/application/queries/get-sale-detail";
import { listSales } from "~/server/workflow/application/queries/list-sales";
import type { SaleView } from "~/server/workflow/application/queries/views/sale";

export async function querySales(filters: {
  limit?: number;
  offset?: number;
}): Promise<SaleView[]> {
  return runAction({
    actionName: "workflow.list_sales",
    access: { kind: "auth" },
    input: filters,
    execute: (ctx) =>
      listSales(getServerRuntime().workflow.deps.saleQueries, {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        ...filters,
      }),
  });
}

export async function querySaleDetail(saleId: string): Promise<SaleView> {
  return runAction({
    actionName: "workflow.get_sale_detail",
    access: { kind: "auth" },
    input: { saleId },
    execute: (ctx) =>
      getSaleDetail(getServerRuntime().workflow.deps.saleQueries, {
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        saleId,
      }),
  });
}
