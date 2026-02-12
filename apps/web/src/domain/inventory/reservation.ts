import type { InventoryItem } from "./types";

export function reserveItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    status: "Reserved",
  };
}

export function releaseItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    status: "Available",
  };
}

export function markAsSold(item: InventoryItem): InventoryItem {
  return {
    ...item,
    status: "Sold",
  };
}
