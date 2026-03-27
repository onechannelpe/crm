import { getDefaultAppPath } from "~/lib/auth/access/route-policy";

export function resolvePostLoginRedirect(
  role: Parameters<typeof getDefaultAppPath>[0],
) {
  return getDefaultAppPath(role);
}
