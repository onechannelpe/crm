"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";

type InventoryItemWithProduct = Awaited<
  ReturnType<typeof repos.inventory.findAllWithProduct>
>[number];

export async function getInventoryItems(): Promise<InventoryItemWithProduct[]> {
  await requirePermission("inventory:read");

  return repos.inventory.findAllWithProduct();
}
