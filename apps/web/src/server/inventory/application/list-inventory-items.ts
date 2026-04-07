import type { InventoryReadRepo } from "./ports";
import { presentInventoryItem } from "./presenters/inventory-item";
import type { InventoryItemView } from "./views/inventory-item-view";

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
