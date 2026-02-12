import { LeadsRepository } from "~/infrastructure/db/repositories/leads";
import type { Result } from "~/domain/shared/result";
import { Ok, Err } from "~/domain/shared/result";

export async function completeLead(
  assignmentId: number,
  userId: number,
): Promise<Result<void, Error>> {
  await LeadsRepository.markCompleted(assignmentId);
  return Ok(undefined);
}
