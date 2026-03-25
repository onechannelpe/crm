"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { notFoundError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { leadWorkflowService, repos } from "~/server/shared/context";
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

      const result = await leadWorkflowService.createSale({
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
      return { id: result.value };
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

      const sale = await repos.leadSales.findById(saleId);
      if (!sale) throw notFoundError("Sale not found");

      return sale;
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

      const limit = Math.min(filters.limit ?? 50, 200);
      const offset = filters.offset ?? 0;

      if (session.role === "executive") {
        return repos.leadSales.listByExecutive(session.userId, limit, offset);
      }
      return repos.leadSales.list(limit, offset);
    },
  });
}
