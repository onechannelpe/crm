"use server";

import type { InventoryItemView } from "~/actions/inventory/contracts";
import { listInventoryItems } from "~/server/inventory/application/list-inventory-items";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function getInventoryItems(): Promise<InventoryItemView[]> {
  const inventory = getServerRuntime().inventory.inventory;
  return runAction({
    actionName: "inventory.list_items",
    access: { kind: "permission", permission: "inventory:read" },
    execute: async () => ({
      ok: true as const,
      value: await listInventoryItems({ inventory }),
    }),
  });
}
