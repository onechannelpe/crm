import { Ok, type Result } from "~/server/shared/result";
import type { DomainError } from "~/server/shared/domain-error";

export function requireFirstHistoryId(
  historyIds: string[],
  _code: string,
): Result<string, DomainError> {
  const historyId = historyIds[0];
  if (historyId == null) {
    throw new Error("Expected a persisted history event id for interaction command");
  }
  return Ok(historyId);
}
