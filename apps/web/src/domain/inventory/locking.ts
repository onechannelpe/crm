import type { InventoryItem, InventoryLock } from "./types";
import { InventoryUnavailableError } from "../shared/errors";
import type { Result } from "../shared/result";
import { Ok, Err } from "../shared/result";
import { config } from "~/shared/config";

export function canLockInventory(
  item: InventoryItem,
): Result<void, InventoryUnavailableError> {
  if (item.status !== "Available") {
    return Err(new InventoryUnavailableError(item.productId));
  }
  return Ok(undefined);
}

export function createLock(
  inventoryItemId: number,
  chargeNoteId: number,
): Omit<InventoryLock, "id"> {
  const now = Date.now();
  const expiryMs = config.inventoryLock.expiryMinutes * 60 * 1000;
  
  return {
    inventoryItemId,
    chargeNoteId,
    lockedAt: now,
    expiresAt: now + expiryMs,
  };
}
