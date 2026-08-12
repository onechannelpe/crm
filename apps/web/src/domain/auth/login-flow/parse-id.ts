import { AuthLoginFlowId } from "~/domain/ids";
import { isErr } from "~/shared/result";

export function parseLoginFlowId(
  raw: string | string[] | undefined,
): AuthLoginFlowId | null {
  if (!raw || Array.isArray(raw)) {
    return null;
  }
  const parsed = AuthLoginFlowId.parse(raw.trim());
  return isErr(parsed) ? null : parsed.value;
}
