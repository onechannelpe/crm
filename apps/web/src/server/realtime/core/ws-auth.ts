import { isRole, type Role } from "~/lib/auth/access/rbac";
import { serverRuntime } from "~/server/runtime";

import type { WsPeer } from "./ws-types";

export interface AppPeerSession {
  userId: number;
  branchId: number;
  role: Role;
  sessionClass: "app" | "pre_auth";
  onboardingCompleted: boolean;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCookieMap(header: string | null): ReadonlyMap<string, string> {
  if (!header) {
    return new Map();
  }

  return new Map(
    header
      .split(";")
      .map((pair) => {
        const separator = pair.indexOf("=");
        if (separator < 0) {
          return null;
        }

        const key = pair.slice(0, separator).trim();
        const value = decodeURIComponent(pair.slice(separator + 1).trim());
        return [key, value] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null),
  );
}

export function readPeerSession(peer: WsPeer): AppPeerSession | null {
  const contextSession = peer.context.session;
  if (!isObjectRecord(contextSession)) {
    return null;
  }

  const { userId, branchId, role, sessionClass, onboardingCompleted } =
    contextSession;

  if (
    typeof userId !== "number" ||
    typeof branchId !== "number" ||
    typeof role !== "string" ||
    !isRole(role) ||
    (sessionClass !== "app" && sessionClass !== "pre_auth") ||
    typeof onboardingCompleted !== "boolean"
  ) {
    return null;
  }

  return {
    userId,
    branchId,
    role,
    sessionClass,
    onboardingCompleted,
  };
}

export async function resolvePeerSession(
  peer: WsPeer,
): Promise<AppPeerSession | null> {
  const cookieHeader = peer.request.headers.get("cookie") ?? null;
  const sessionToken = readCookieMap(cookieHeader).get("session");
  if (!sessionToken) {
    return null;
  }

  const validation =
    await serverRuntime.auth.sessionService.validateSessionToken(sessionToken);
  if (!validation.session) {
    return null;
  }

  return {
    userId: validation.session.userId,
    branchId: validation.session.branchId,
    role: validation.session.role,
    sessionClass: validation.session.sessionClass,
    onboardingCompleted: validation.session.onboardingCompleted,
  };
}
