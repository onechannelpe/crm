"use server";

import {
  getBootstrap as getBootstrapService,
  getFixContext as getFixContextService,
  listConfirmed as listConfirmedService,
  listPending as listPendingService,
  listProducts as listProductsService,
} from "~/server/sales-records/application/queries";
import type {
  SalesRecordBootstrap,
  SalesRecordFixContext,
  SalesRecordProductOption,
  SalesRecordQueueItem,
} from "~/server/sales-records/domain/types";
import { createSalesRecordDeps } from "~/server/sales-records/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

import { parseSalesContactId, parseSalesRecordId } from "./input";

export async function listSalesRecordProducts(): Promise<
  SalesRecordProductOption[]
> {
  return runAction({
    actionName: "sales_records.products.read",
    permission: "sales:create",
    execute: async () => Ok(await listProductsService(createSalesRecordDeps())),
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
    execute: async (ctx) =>
      Ok(
        await getBootstrapService(ctx, createSalesRecordDeps(), {
          contactId: safeContactId,
        }),
      ),
  });
}

export async function listPendingSalesRecords(): Promise<
  SalesRecordQueueItem[]
> {
  return runAction({
    actionName: "sales_records.pending.read",
    permission: "sales:review",
    execute: async (ctx) =>
      Ok(await listPendingService(ctx, createSalesRecordDeps())),
  });
}

export async function listConfirmedSalesRecords(): Promise<
  SalesRecordQueueItem[]
> {
  return runAction({
    actionName: "sales_records.confirmed.read",
    permission: "sales:review",
    execute: async (ctx) =>
      Ok(await listConfirmedService(ctx, createSalesRecordDeps())),
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
    execute: async (ctx) =>
      Ok(
        await getFixContextService(ctx, createSalesRecordDeps(), {
          recordId: safeRecordId,
        }),
      ),
  });
}
