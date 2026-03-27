"use server";

import { validationError } from "~/lib/app-errors";
import { requireRole } from "~/lib/auth/access/session";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import {
  invalidateSession,
  invalidateUserSessions,
} from "~/lib/auth/session/session-manager";
import {
  allSessionsRevokedChanges,
  serializeAuditChanges,
  sessionRevokedByAdminChanges,
} from "~/lib/contracts/audit";
import type { ActionSuccess } from "~/lib/contracts/common";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import {
  parseRevokeAllUserSessionsInput,
  parseRevokeUserSessionInput,
} from "./input";

export async function revokeUserSession(
  sessionId: string,
  targetUserId: number,
): Promise<ActionSuccess> {
  const parsedInput = parseRevokeUserSessionInput({ sessionId, targetUserId });
  if (isErr(parsedInput)) {
    throw validationError(parsedInput.error.message);
  }
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);

  await invalidateSession(parsedInput.value.sessionId);
  await repos.extensionRuntime.revokeInstallationSessionsByAuthSession(
    parsedInput.value.sessionId,
    Date.now(),
  );
  await repos.extensionRuntime.updateExecutiveSyncHealthByUser({
    user_id: parsedInput.value.targetUserId,
    sync_health: "reauth_required",
    sync_updated_at: Date.now(),
  });

  await repos.auditLogs.create({
    user_id: session.userId,
    action: "session_revoked_by_admin",
    entity_type: "user_session",
    entity_id: parsedInput.value.targetUserId,
    changes: serializeAuditChanges(
      sessionRevokedByAdminChanges(parsedInput.value.sessionId, session.userId),
    ),
    created_at: Date.now(),
  });

  return { success: true };
}

export async function revokeAllUserSessions(
  targetUserId: number,
): Promise<ActionSuccess> {
  const parsedInput = parseRevokeAllUserSessionsInput(targetUserId);
  if (isErr(parsedInput)) {
    throw validationError(parsedInput.error.message);
  }
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);

  await invalidateUserSessions(parsedInput.value.targetUserId);
  await repos.extensionRuntime.revokeInstallationSessionsByUser(
    parsedInput.value.targetUserId,
    Date.now(),
  );
  await repos.extensionRuntime.updateExecutiveSyncHealthByUser({
    user_id: parsedInput.value.targetUserId,
    sync_health: "reauth_required",
    sync_updated_at: Date.now(),
  });

  await repos.auditLogs.create({
    user_id: session.userId,
    action: "all_sessions_revoked",
    entity_type: "user",
    entity_id: parsedInput.value.targetUserId,
    changes: serializeAuditChanges(allSessionsRevokedChanges(session.userId)),
    created_at: Date.now(),
  });

  return { success: true };
}
