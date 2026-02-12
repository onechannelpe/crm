import { SalesRepository } from "~/infrastructure/db/repositories/sales";
import { createChargeNote } from "~/domain/sales/charge-note";
import type { Result } from "~/domain/shared/result";
import { Ok } from "~/domain/shared/result";

export async function createSale(
  contactId: number,
  userId: number,
): Promise<Result<number, Error>> {
  const note = createChargeNote(contactId, userId);
  const id = await SalesRepository.create(note);
  return Ok(id);
}
