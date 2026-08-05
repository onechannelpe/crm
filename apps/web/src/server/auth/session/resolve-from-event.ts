import { getCookie, type H3Event } from "h3";

import type { AuthSession } from "~/domain/auth/access/session-types";
import type { OperationContext } from "~/server/platform/operation/context";

import { SESSION_COOKIE_NAME } from "./cookie-name";

// Resolves the session from an explicit H3Event. Used by entry points outside
// SolidStart's request-scoped helpers.
export async function resolveSessionFromEvent(
  event: H3Event,
  resolveAuthSession: (
    token: string,
    operation: OperationContext,
  ) => Promise<AuthSession | null>,
): Promise<AuthSession | null> {
  const token = getCookie(event, SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  return resolveAuthSession(token, { operationAt: new Date() });
}
