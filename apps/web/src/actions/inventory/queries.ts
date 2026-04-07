"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { db } from "~/lib/db/db";
import type { InventoryItemView } from "~/server/inventory/application/contracts";
import { listInventoryItems } from "~/server/inventory/application/list-inventory-items";
import { createInventoryRepo } from "~/server/inventory/repos";

const inventory = createInventoryRepo(db);

export async function getInventoryItems(): Promise<InventoryItemView[]> {
  await requirePermission("inventory:read");

  return listInventoryItems({ inventory });
}
