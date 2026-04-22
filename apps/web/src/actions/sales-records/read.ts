"use server";

import type {
  SalesRecordBootstrapView,
  SalesRecordEditContextView,
  SalesRecordProductOptionView,
  SalesRecordQueueItemView,
} from "~/actions/sales-records/contracts";
import { getServerRuntime } from "~/server/runtime";
import { getBootstrap as getBootstrapService } from "~/server/sales-records/application/queries/get-bootstrap";
import { getEditContext as getEditContextService } from "~/server/sales-records/application/queries/get-fix-context";
import { listConfirmed as listConfirmedService } from "~/server/sales-records/application/queries/list-confirmed";
import { listPending as listPendingService } from "~/server/sales-records/application/queries/list-pending";
import { listProducts as listProductsService } from "~/server/sales-records/application/queries/list-products";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

import { parseSalesContactId, parseSalesRecordId } from "./input";

export async function listSalesRecordProducts(): Promise<
  SalesRecordProductOptionView[]
> {
  return runAction({
    actionName: "sales_records.products.read",
    access: { kind: "permission", permission: "sales:create" },
    execute: async () =>
      Ok(await listProductsService(getServerRuntime().salesRecords.read)),
  });
}

export async function getSalesRecordBootstrap(
  contactId: number | null,
): Promise<SalesRecordBootstrapView> {
  const safeContactId =
    contactId === null ? null : parseSalesContactId(contactId);
  return runAction({
    actionName: "sales_records.bootstrap.read",
    access: { kind: "permission", permission: "sales:create" },
    input: { contactId: safeContactId },
    execute: async (ctx) =>
      getBootstrapService(ctx, getServerRuntime().salesRecords.read, {
        contactId: safeContactId,
      }),
  });
}

export async function listPendingSalesRecords(): Promise<
  SalesRecordQueueItemView[]
> {
  return runAction({
    actionName: "sales_records.pending.read",
    access: { kind: "permission", permission: "sales:review" },
    execute: async (ctx) =>
      Ok(await listPendingService(ctx, getServerRuntime().salesRecords.read)),
  });
}

export async function listConfirmedSalesRecords(): Promise<
  SalesRecordQueueItemView[]
> {
  return runAction({
    actionName: "sales_records.confirmed.read",
    access: { kind: "permission", permission: "sales:review" },
    execute: async (ctx) =>
      Ok(await listConfirmedService(ctx, getServerRuntime().salesRecords.read)),
  });
}

export async function getSalesRecordEditContext(
  recordId: number,
): Promise<SalesRecordEditContextView> {
  const safeRecordId = parseSalesRecordId(recordId);
  return runAction({
    actionName: "sales_records.edit_context.read",
    access: { kind: "permission", permission: "sales:create" },
    input: { recordId: safeRecordId },
    execute: async (ctx) =>
      getEditContextService(ctx, getServerRuntime().salesRecords.read, {
        recordId: safeRecordId,
      }),
  });
}
