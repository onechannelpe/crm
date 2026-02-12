export type InventoryStatus = "Available" | "Reserved" | "Sold";

export interface InventoryItem {
  id: number;
  productId: number;
  serialNumber: string;
  status: InventoryStatus;
  createdAt: number;
}

export interface InventoryLock {
  id: number;
  inventoryItemId: number;
  chargeNoteId: number;
  lockedAt: number;
  expiresAt: number;
}

export function isLockExpired(lock: InventoryLock, now: number = Date.now()): boolean {
  return now >= lock.expiresAt;
}
