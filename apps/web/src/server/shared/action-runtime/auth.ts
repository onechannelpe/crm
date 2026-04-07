import type { Permission, Role } from "~/lib/auth/access/rbac";
import {
  requireAuth as requireAuthActor,
  requirePermission,
  requireRole,
  requireSession as requireSessionActor,
} from "~/lib/auth/access/session";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";

import { createAppContext, type AppContext } from "./context";

export type ActionAccess =
  | { kind: "permission"; permission: Permission }
  | { kind: "role"; role: Role }
  | { kind: "auth" }
  | { kind: "session" };

export type ActionStepUpRequirement = {
  stepUp?: "recent_strong_auth";
};

async function resolveActor(access: ActionAccess) {
  switch (access.kind) {
    case "permission":
      return requirePermission(access.permission);
    case "role":
      return requireRole(access.role);
    case "auth":
      return requireAuthActor();
    case "session":
      return requireSessionActor();
    default: {
      const unreachable: never = access;
      throw new Error(String(unreachable));
    }
  }
}

export async function resolveActionContext(
  params: { access: ActionAccess } & ActionStepUpRequirement,
): Promise<AppContext> {
  const actor = await resolveActor(params.access);
  if (params.stepUp === "recent_strong_auth") {
    assertRecentStrongAuth(actor);
  }

  return createAppContext(actor);
}
