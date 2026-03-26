"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { createSaleUseCase } from "~/server/sales/application/create-sale";
import { getSaleDetailQuery } from "~/server/sales/application/get-sale-detail";
import { listSalesQuery } from "~/server/sales/application/list-sales";
import { isErr } from "~/server/shared/result";

export interface CreateLeadSaleInput {
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
}

export async function createLeadSale(
  input: CreateLeadSaleInput,
): Promise<{ id: number }> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sale.create",
    actor,
    input: { leadId: input.leadId },
    run: async () => {
      const session = await requirePermission("lead:register");
      actor.userId = session.userId;
      actor.role = session.role;

      if (!input.proveedorActual?.trim())
        throw validationError("proveedorActual is required");
      if (!input.banco?.trim()) throw validationError("banco is required");
      if (!input.nroCuenta?.trim())
        throw validationError("nroCuenta is required");
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

      const result = await createSaleUseCase({
        leadId: input.leadId,
        executiveId: session.userId,
        proveedorActual: input.proveedorActual,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        abono: input.abono,
        cantidadPos: input.cantidadPos,
        banco: input.banco,
        nroCuenta: input.nroCuenta,
        cci: input.cci,
      });

      if (isErr(result)) throwDomainError(result.error);
      return result.value;
    },
  });
}

export async function getLeadSale(saleId: number) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sale.get",
    actor,
    input: { saleId },
    run: async () => {
      const session = await requirePermission("lead:register");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await getSaleDetailQuery({
        saleId,
        actorUserId: session.userId,
        actorRole: session.role,
      });
      if (isErr(result)) throwDomainError(result.error);
      return result.value;
    },
  });
}

export async function listLeadSales(filters: {
  limit?: number;
  offset?: number;
}) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sale.list",
    actor,
    input: {},
    run: async () => {
      const session = await requirePermission("lead:register");
      actor.userId = session.userId;
      actor.role = session.role;

      return listSalesQuery({
        actorRole: session.role,
        actorUserId: session.userId,
        limit: filters.limit,
        offset: filters.offset,
      });
    },
  });
}
