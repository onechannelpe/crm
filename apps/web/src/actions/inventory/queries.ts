"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { db } from "~/lib/db/db";
import { listInventoryItems } from "~/server/inventory/application/list-inventory-items";
import type { InventoryItemView } from "~/server/inventory/application/views/inventory-item-view";
import { createInventoryRepo } from "~/server/inventory/repos";

const inventory = createInventoryRepo(db);

export async function getInventoryItems(): Promise<InventoryItemView[]> {
  await requirePermission("inventory:read");

  return listInventoryItems({ inventory });
}
