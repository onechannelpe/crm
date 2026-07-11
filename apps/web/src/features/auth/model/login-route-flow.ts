import { AuthLoginFlowId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

export function parseLoginFlowId(
  raw: string | string[] | undefined,
): AuthLoginFlowId | null {
  if (!raw || Array.isArray(raw)) return null;
  const parsed = AuthLoginFlowId.parse(raw.trim());
  return isErr(parsed) ? null : parsed.value;
}
