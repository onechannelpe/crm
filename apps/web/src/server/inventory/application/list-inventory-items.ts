import type { InventoryReadRepo } from "./ports";
import { presentInventoryItem } from "./presenters/inventory-item";
import type { InventoryItemView } from "./queries/views/inventory-item";

export type InventoryReadDeps = {
  inventory: InventoryReadRepo;
};

export function listInventoryItems(
  deps: InventoryReadDeps,
): Promise<InventoryItemView[]> {
  return deps.inventory
    .findAllWithProduct()
    .then((items) => items.map(presentInventoryItem));
}
