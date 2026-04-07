export type InventoryItemStatus = "available" | "reserved" | "sold";

export type InventoryItemView = {
  id: number;
  serialNumber: string;
  status: InventoryItemStatus;
  createdAt: number;
  productName: string;
  category: string;
};
