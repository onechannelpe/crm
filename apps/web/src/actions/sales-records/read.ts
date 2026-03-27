"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { runAction } from "~/server/shared/action-runtime";
import {
  getBootstrap as getBootstrapService,
  getFixContext as getFixContextService,
  listConfirmed as listConfirmedService,
  listPending as listPendingService,
  listProducts as listProductsService,
} from "~/server/sales-records/read-service";
import type {
  SalesRecordBootstrap,
  SalesRecordFixContext,
  SalesRecordProductOption,
  SalesRecordQueueItem,
} from "~/server/sales-records/types";

import { parseSalesContactId, parseSalesRecordId } from "./input";

export async function listSalesRecordProducts(): Promise<
  SalesRecordProductOption[]
> {
  const session = await requirePermission("sales:create");
  return runAction({
    actionName: "sales_records.products.read",
    actor: session,
    execute: async () => ({ ok: true, value: await listProductsService() }),
  });
}

export async function getSalesRecordBootstrap(
  contactId: number | null,
): Promise<SalesRecordBootstrap> {
  const session = await requirePermission("sales:create");
  const safeContactId = contactId === null ? null : parseSalesContactId(contactId);
  return runAction({
    actionName: "sales_records.bootstrap.read",
    actor: session,
    input: { contactId: safeContactId },
    execute: async (ctx) => ({
      ok: true,
      value: await getBootstrapService(ctx, { contactId: safeContactId }),
    }),
  });
}

export async function listPendingSalesRecords(): Promise<
  SalesRecordQueueItem[]
> {
  const session = await requirePermission("sales:review");
  return runAction({
    actionName: "sales_records.pending.read",
    actor: session,
    execute: async (ctx) => ({ ok: true, value: await listPendingService(ctx) }),
  });
}

export async function listConfirmedSalesRecords(): Promise<
  SalesRecordQueueItem[]
> {
  const session = await requirePermission("sales:review");
  return runAction({
    actionName: "sales_records.confirmed.read",
    actor: session,
    execute: async (ctx) => ({
      ok: true,
      value: await listConfirmedService(ctx),
    }),
  });
}

export async function getSalesRecordFixContext(
  recordId: number,
): Promise<SalesRecordFixContext> {
  const safeRecordId = parseSalesRecordId(recordId);
  const session = await requirePermission("sales:create");
  return runAction({
    actionName: "sales_records.fix_context.read",
    actor: session,
    input: { recordId: safeRecordId },
    execute: async (ctx) => ({
      ok: true,
      value: await getFixContextService(ctx, { recordId: safeRecordId }),
    }),
  });
}
