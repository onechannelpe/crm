"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { db } from "~/lib/db/db";
import { createInventoryRepo } from "~/server/inventory/repos";

const inventory = createInventoryRepo(db);

type InventoryItemWithProduct = Awaited<
  ReturnType<typeof inventory.findAllWithProduct>
>[number];

export async function getInventoryItems(): Promise<InventoryItemWithProduct[]> {
  await requirePermission("inventory:read");

  return inventory.findAllWithProduct();
}
