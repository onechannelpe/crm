import type { Role } from "~/lib/auth/access/rbac";

import { resolveLeadCapabilities } from "../../domain/lead/lead-capabilities";

export function resolveCapabilitiesForRole(role: Role) {
  return resolveLeadCapabilities(role);
}
