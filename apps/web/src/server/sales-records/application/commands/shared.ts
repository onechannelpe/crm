import { Ok, type Result } from "~/server/shared/result";

export function okCommandResult(): Result<{ success: true }, never> {
  return Ok({ success: true as const });
}
