import type { InventoryItemStatus } from "../domain/item";

export type InventoryItemRow = {
  id: number;
  product_id: number;
  serial_number: string;
  status: InventoryItemStatus;
  created_at: number;
};

export type InventoryItemWithProductRecord = {
  id: number;
  serial_number: string;
  status: InventoryItemStatus;
  created_at: number;
  product_name: string;
  category: string;
};

export type InventoryReadRepo = {
  findAllWithProduct(): Promise<InventoryItemWithProductRecord[]>;
};
