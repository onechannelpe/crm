import { SalesRepository } from "~/infrastructure/db/repositories/sales";
import { AuditRepository } from "~/infrastructure/db/repositories/audit";
import { canTransition } from "~/domain/sales/workflow";
import type { Result } from "~/domain/shared/result";
import { Ok, Err, isOk } from "~/domain/shared/result";

export async function approveSale(
  chargeNoteId: number,
  reviewerId: number,
): Promise<Result<void, Error>> {
  const note = await SalesRepository.getById(chargeNoteId);
  if (!note) {
    return Err(new Error("Charge note not found"));
  }

  const transitionCheck = canTransition(note.status, "Approved");
  if (!isOk(transitionCheck)) {
    return Err(transitionCheck.error);
  }

  await SalesRepository.updateStatus(chargeNoteId, "Approved");
  await AuditRepository.logAction(reviewerId, "approve_sale", "charge_note", chargeNoteId);

  return Ok(undefined);
}
