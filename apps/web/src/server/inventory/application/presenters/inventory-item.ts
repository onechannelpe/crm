import type { InventoryItemView } from "../contracts";
import type { InventoryItemWithProductRecord } from "../ports";

export function presentInventoryItem(
  item: InventoryItemWithProductRecord,
): InventoryItemView {
  return {
    id: item.id,
    serialNumber: item.serial_number,
    status: item.status,
    createdAt: item.created_at,
    productName: item.product_name,
    category: item.category,
  };
}
