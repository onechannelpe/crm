"use server";

import type { InventoryItemView } from "~/actions/inventory/contracts";
import { db } from "~/lib/db/db";
import { listInventoryItems } from "~/server/inventory/application/list-inventory-items";
import { createInventoryRepo } from "~/server/inventory/repos";
import { runAction } from "~/server/shared/action-runtime";

const inventory = createInventoryRepo(db);

export async function getInventoryItems(): Promise<InventoryItemView[]> {
  return runAction({
    actionName: "inventory.list_items",
    permission: "inventory:read",
    execute: async () => ({
      ok: true as const,
      value: await listInventoryItems({ inventory }),
    }),
  });
}
