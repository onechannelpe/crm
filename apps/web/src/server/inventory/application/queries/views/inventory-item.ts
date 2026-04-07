import type { InventoryItemStatus } from "../../../domain/item";

export type InventoryItemView = {
  id: number;
  serialNumber: string;
  status: InventoryItemStatus;
  createdAt: number;
  productName: string;
  category: string;
};
