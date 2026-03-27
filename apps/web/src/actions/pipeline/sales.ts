"use server";

import { validationError } from "~/lib/app-errors";
import { createSaleUseCase } from "~/server/sales/application/create-sale";
import { getSaleDetailQuery } from "~/server/sales/application/get-sale-detail";
import { listSalesQuery } from "~/server/sales/application/list-sales";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

export async function createLeadSale(
  input: Omit<Parameters<typeof createSaleUseCase>[0], "executiveId">,
): Promise<{ id: number }> {
  if (!input.proveedorActual?.trim())
    throw validationError("proveedorActual is required");
  if (!input.banco?.trim()) throw validationError("banco is required");
  if (!input.nroCuenta?.trim()) throw validationError("nroCuenta is required");
  for (const [key, val] of [
    ["tasaActual", input.tasaActual],
    ["gpv", input.gpv],
    ["ticket", input.ticket],
    ["abono", input.abono],
  ] as [string, number][]) {
    if (typeof val !== "number" || val < 0) {
      throw validationError(`${key} must be a non-negative number`);
    }
  }
  if (
    typeof input.cantidadPos !== "number" ||
    input.cantidadPos < 0 ||
    !Number.isInteger(input.cantidadPos)
  ) {
    throw validationError("cantidadPos must be a non-negative integer");
  }

  return runAction({
    actionName: "sale.create",
    permission: "lead:register",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      createSaleUseCase({
        leadId: input.leadId,
        executiveId: ctx.actor.userId,
        proveedorActual: input.proveedorActual,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        abono: input.abono,
        cantidadPos: input.cantidadPos,
        banco: input.banco,
        nroCuenta: input.nroCuenta,
        cci: input.cci,
      }),
  });
}

export async function getLeadSale(saleId: number) {
  return runAction({
    actionName: "sale.get",
    permission: "lead:register",
    input: { saleId },
    execute: (ctx) =>
      getSaleDetailQuery({
        saleId,
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
      }),
  });
}

export async function listLeadSales(filters: {
  limit?: number;
  offset?: number;
}) {
  return runAction({
    actionName: "sale.list",
    permission: "lead:register",
    input: {},
    execute: async (ctx) =>
      Ok(
        await listSalesQuery({
          actorRole: ctx.actor.role,
          actorUserId: ctx.actor.userId,
          limit: filters.limit,
          offset: filters.offset,
        }),
      ),
  });
}
