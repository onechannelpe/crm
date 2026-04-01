"use server";

import { validationError } from "~/lib/app-errors";
import {
  createSale,
  getSaleDetail,
  listSales,
} from "~/server/lead-pipeline/application/sales";
import { runAction } from "~/server/shared/action-runtime";

export async function requestSaleCreation(input: {
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
}) {
  if (!input.proveedorActual?.trim()) {
    throw validationError("proveedorActual is required");
  }
  if (!input.banco?.trim()) {
    throw validationError("banco is required");
  }
  if (!input.nroCuenta?.trim()) {
    throw validationError("nroCuenta is required");
  }

  return runAction({
    actionName: "lead_pipeline.create_sale",
    permission: "lead:register",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      createSale({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        ...input,
      }),
  });
}

export async function querySales(filters: { limit?: number; offset?: number }) {
  return runAction({
    actionName: "lead_pipeline.list_sales",
    permission: "lead:register",
    input: filters,
    execute: (ctx) =>
      listSales({
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        ...filters,
      }),
  });
}

export async function querySaleDetail(saleId: number) {
  return runAction({
    actionName: "lead_pipeline.get_sale_detail",
    permission: "lead:register",
    input: { saleId },
    execute: (ctx) =>
      getSaleDetail({
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        saleId,
      }),
  });
}
