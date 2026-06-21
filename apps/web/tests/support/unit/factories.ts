import type { Role } from "~/lib/auth/access/rbac";
import type { AuthSession } from "~/lib/auth/access/session-types";
import type { AppContext } from "~/server/platform/action/context";
import type { BranchId, UserId } from "~/server/shared/ids";

export function makeAuthSession(
  overrides: Partial<AuthSession> = {},
): AuthSession {
  const onboardingCompleted = overrides.onboardingCompleted ?? true;

  return {
    id: "test-session-id",
    userId: 99 as UserId,
    branchId: 1 as BranchId,
    role: "executive" as Role,
    onboardingCompleted,
    sessionClass: onboardingCompleted ? "app" : "pre_auth",
    primaryAuthMethod: "password",
    strongAuthMethod: null,
    strongAuthAt: null,
    ...overrides,
  };
}

export const makeActor = makeAuthSession;

export function makeAppContext(
  overrides: Partial<AppContext> = {},
): AppContext {
  return {
    actor: makeActor(),
    requestId: "test-req-id",
    traceId: "test-trace-id",
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
    publicOrigin: "http://localhost:3000",
    now: () => 1_700_000_000_000,
    ...overrides,
  };
}
