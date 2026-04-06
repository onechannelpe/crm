import type { InventoryItemView } from "./views/inventory-item-view";

export type InventoryReadDeps = {
  inventory: {
    findAllWithProduct(): Promise<InventoryItemView[]>;
  };
};

export function listInventoryItems(
  deps: InventoryReadDeps,
): Promise<InventoryItemView[]> {
  return deps.inventory.findAllWithProduct();
}
