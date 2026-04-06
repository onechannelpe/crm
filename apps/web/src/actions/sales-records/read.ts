"use server";

import { getBootstrap as getBootstrapService } from "~/server/sales-records/application/queries/get-bootstrap";
import { getFixContext as getFixContextService } from "~/server/sales-records/application/queries/get-fix-context";
import { listConfirmed as listConfirmedService } from "~/server/sales-records/application/queries/list-confirmed";
import { listPending as listPendingService } from "~/server/sales-records/application/queries/list-pending";
import { listProducts as listProductsService } from "~/server/sales-records/application/queries/list-products";
import type {
  SalesRecordBootstrapView,
  SalesRecordFixContextView,
  SalesRecordProductOptionView,
  SalesRecordQueueItemView,
} from "~/server/sales-records/application/queries/views/sales-record-view";
import { createSalesRecordReadContext } from "~/server/sales-records/infrastructure/read-context";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

import { parseSalesContactId, parseSalesRecordId } from "./input";

export type {
  SalesRecordBootstrapView,
  SalesRecordFixContextView,
  SalesRecordProductOptionView,
  SalesRecordQueueItemView,
};

export async function listSalesRecordProducts(): Promise<
  SalesRecordProductOptionView[]
> {
  return runAction({
    actionName: "sales_records.products.read",
    permission: "sales:create",
    execute: async () =>
      Ok(await listProductsService(createSalesRecordReadContext())),
  });
}

export async function getSalesRecordBootstrap(
  contactId: number | null,
): Promise<SalesRecordBootstrapView> {
  const safeContactId =
    contactId === null ? null : parseSalesContactId(contactId);
  return runAction({
    actionName: "sales_records.bootstrap.read",
    permission: "sales:create",
    input: { contactId: safeContactId },
    execute: async (ctx) =>
      Ok(
        await getBootstrapService(ctx, createSalesRecordReadContext(), {
          contactId: safeContactId,
        }),
      ),
  });
}

export async function listPendingSalesRecords(): Promise<
  SalesRecordQueueItemView[]
> {
  return runAction({
    actionName: "sales_records.pending.read",
    permission: "sales:review",
    execute: async (ctx) =>
      Ok(await listPendingService(ctx, createSalesRecordReadContext())),
  });
}

export async function listConfirmedSalesRecords(): Promise<
  SalesRecordQueueItemView[]
> {
  return runAction({
    actionName: "sales_records.confirmed.read",
    permission: "sales:review",
    execute: async (ctx) =>
      Ok(await listConfirmedService(ctx, createSalesRecordReadContext())),
  });
}

export async function getSalesRecordFixContext(
  recordId: number,
): Promise<SalesRecordFixContextView> {
  const safeRecordId = parseSalesRecordId(recordId);
  return runAction({
    actionName: "sales_records.fix_context.read",
    permission: "sales:create",
    input: { recordId: safeRecordId },
    execute: async (ctx) =>
      Ok(
        await getFixContextService(ctx, createSalesRecordReadContext(), {
          recordId: safeRecordId,
        }),
      ),
  });
}
