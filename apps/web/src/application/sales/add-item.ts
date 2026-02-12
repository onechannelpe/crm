import { SalesRepository } from "~/infrastructure/db/repositories/sales";
import { InventoryRepository } from "~/infrastructure/db/repositories/inventory";
import { canLockInventory, createLock } from "~/domain/inventory/locking";
import { reserveItem } from "~/domain/inventory/reservation";
import { isDraft } from "~/domain/sales/workflow";
import type { Result } from "~/domain/shared/result";
import { Ok, Err, isOk } from "~/domain/shared/result";

export async function addItem(
  chargeNoteId: number,
  productId: number,
  quantity: number,
): Promise<Result<void, Error>> {
  const note = await SalesRepository.getById(chargeNoteId);
  if (!note) {
    return Err(new Error("Charge note not found"));
  }

  if (!isDraft(note.status)) {
    return Err(new Error("Cannot modify submitted charge note"));
  }

  const inventory = await InventoryRepository.findAvailable(productId);
  if (!inventory) {
    return Err(new Error("Product out of stock"));
  }

  const lockCheck = canLockInventory(inventory);
  if (!isOk(lockCheck)) {
    return Err(lockCheck.error);
  }

  await InventoryRepository.updateStatus(inventory.id, "Reserved");
  const lock = createLock(inventory.id, chargeNoteId);
  await InventoryRepository.createLock(lock);

  await SalesRepository.addItem({
    charge_note_id: chargeNoteId,
    product_id: productId,
    quantity,
  });

  return Ok(undefined);
}
