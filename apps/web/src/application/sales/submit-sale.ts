import { SalesRepository } from "~/infrastructure/db/repositories/sales";
import { InventoryRepository } from "~/infrastructure/db/repositories/inventory";
import { AuditRepository } from "~/infrastructure/db/repositories/audit";
import { canTransition } from "~/domain/sales/workflow";
import type { Result } from "~/domain/shared/result";
import { Ok, Err, isOk } from "~/domain/shared/result";

export async function submitSale(
  chargeNoteId: number,
  userId: number,
): Promise<Result<void, Error>> {
  const note = await SalesRepository.getById(chargeNoteId);
  if (!note) {
    return Err(new Error("Charge note not found"));
  }

  const transitionCheck = canTransition(note.status, "Pending_Back");
  if (!isOk(transitionCheck)) {
    return Err(transitionCheck.error);
  }

  const locks = await InventoryRepository.getActiveLocks(chargeNoteId);
  if (locks.length === 0) {
    return Err(new Error("No inventory locked"));
  }

  await SalesRepository.updateStatus(chargeNoteId, "Pending_Back");
  await AuditRepository.logAction(userId, "submit_sale", "charge_note", chargeNoteId);

  return Ok(undefined);
}
