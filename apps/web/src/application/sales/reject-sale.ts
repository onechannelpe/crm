import { db } from "~/infrastructure/db/client";
import { SalesRepository } from "~/infrastructure/db/repositories/sales";
import { AuditRepository } from "~/infrastructure/db/repositories/audit";
import { canTransition } from "~/domain/sales/workflow";
import { createRejection } from "~/domain/sales/rejection";
import type { Result } from "~/domain/shared/result";
import { Ok, Err, isOk } from "~/domain/shared/result";

interface RejectionItem {
  fieldId: string;
  note: string;
}

export async function rejectSale(
  chargeNoteId: number,
  reviewerId: number,
  rejections: RejectionItem[],
): Promise<Result<void, Error>> {
  const note = await SalesRepository.getById(chargeNoteId);
  if (!note) {
    return Err(new Error("Charge note not found"));
  }

  const transitionCheck = canTransition(note.status, "Rejected");
  if (!isOk(transitionCheck)) {
    return Err(transitionCheck.error);
  }

  for (const item of rejections) {
    const rejection = createRejection({
      chargeNoteId,
      reviewerId,
      fieldId: item.fieldId,
      reviewerNote: item.note,
    });

    await db
      .insertInto("rejection_logs")
      .values(rejection)
      .execute();
  }

  await SalesRepository.updateStatus(chargeNoteId, "Rejected");
  await AuditRepository.logAction(reviewerId, "reject_sale", "charge_note", chargeNoteId, {
    rejections: rejections.map(r => r.fieldId),
  });

  return Ok(undefined);
}
