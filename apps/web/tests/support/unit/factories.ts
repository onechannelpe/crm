import type { AuthSession } from "~/domain/auth/access/session-types";
import { BranchId, UserId } from "~/domain/ids";
import type { AppContext } from "~/server/platform/action/context";

export function makeAuthSession(
  overrides: Partial<AuthSession> = {},
): AuthSession {
  return {
    id: "test-session-id",
    userId: UserId.trust("unit-user"),
    branchId: BranchId.trust("unit-branch"),
    role: "executive",
    sessionClass: "app",
    primaryAuthMethod: "password",
    strongAuthMethod: null,
    strongAuthAt: null,
    ...overrides,
    impersonatorUserId: overrides.impersonatorUserId ?? null,
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
    operationAt: new Date(1_700_000_000_000),
    ...overrides,
  };
}
