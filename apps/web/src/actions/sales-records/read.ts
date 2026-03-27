"use server";

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
import { runAction } from "~/server/shared/action-runtime";

import { parseSalesContactId, parseSalesRecordId } from "./input";

export async function listSalesRecordProducts(): Promise<
  SalesRecordProductOption[]
> {
  return runAction({
    actionName: "sales_records.products.read",
    permission: "sales:create",
    execute: async () => ({ ok: true, value: await listProductsService() }),
  });
}

export async function getSalesRecordBootstrap(
  contactId: number | null,
): Promise<SalesRecordBootstrap> {
  const safeContactId =
    contactId === null ? null : parseSalesContactId(contactId);
  return runAction({
    actionName: "sales_records.bootstrap.read",
    permission: "sales:create",
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
  return runAction({
    actionName: "sales_records.pending.read",
    permission: "sales:review",
    execute: async (ctx) => ({
      ok: true,
      value: await listPendingService(ctx),
    }),
  });
}

export async function listConfirmedSalesRecords(): Promise<
  SalesRecordQueueItem[]
> {
  return runAction({
    actionName: "sales_records.confirmed.read",
    permission: "sales:review",
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
  return runAction({
    actionName: "sales_records.fix_context.read",
    permission: "sales:create",
    input: { recordId: safeRecordId },
    execute: async (ctx) => ({
      ok: true,
      value: await getFixContextService(ctx, { recordId: safeRecordId }),
    }),
  });
}
