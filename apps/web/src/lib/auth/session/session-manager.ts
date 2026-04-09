import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";
import { createSessionService } from "~/server/features/auth/application/session-service";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { UserId } from "~/server/shared/ids";
import { createUsersRepo } from "~/server/users/repos-users";

import type {
  CreateSessionParams,
  SessionDeps,
  SessionRepositoryPort,
  SessionUsersPort,
} from "../types";

const logger = createLogger("session-manager");

export interface SessionValidationResult {
  session: import("~/lib/auth/access/session-types").AuthSession | null;
}

const defaultRepos = {
  sessions: createSessionRepository(db),
  users: createUsersRepo(db),
};

function resolveDeps(deps?: SessionDeps): {
  sessions: SessionRepositoryPort;
  users: SessionUsersPort;
} {
  return {
    sessions: deps?.sessions ?? defaultRepos.sessions,
    users: deps?.users ?? defaultRepos.users,
  };
}

function resolveSessionService(deps?: SessionDeps) {
  const resolved = resolveDeps(deps);
  return createSessionService({
    sessions: resolved.sessions,
    users: resolved.users,
    logger,
  });
}

export async function createSession(
  params: CreateSessionParams,
  deps?: SessionDeps,
): Promise<string> {
  return resolveSessionService(deps).createSession(params);
}

export async function validateSessionToken(
  token: string,
  deps?: SessionDeps,
): Promise<SessionValidationResult> {
  return resolveSessionService(deps).validateSessionToken(token);
}

export async function invalidateSession(
  sessionId: string,
  deps?: SessionDeps,
): Promise<void> {
  await resolveSessionService(deps).invalidateSession(sessionId);
}

export async function invalidateUserSessions(
  userId: UserId,
  deps?: SessionDeps,
): Promise<void> {
  await resolveSessionService(deps).invalidateUserSessions(userId);
}
