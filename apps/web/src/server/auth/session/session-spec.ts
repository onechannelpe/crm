import type { Selectable } from "kysely";

import type { Role } from "~/lib/auth/access/rbac";
import type { AuthSession } from "~/lib/auth/access/session-types";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";
import type { UserSessionRow } from "~/lib/auth/types";
import type { UsersTable } from "~/lib/db/types";
import type { BranchId, UserId } from "~/server/shared/ids";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

type UserRow = Selectable<UsersTable>;

/**
 * The minimal user shape needed to mint a session. Flows fetch the user as part
 * of proving identity and hand this subset to `establish`.
 */
export type SessionUser = Pick<
  UserRow,
  "id" | "branch_id" | "role" | "onboarding_completed_at"
>;

export interface SessionRequestMetadata {
  ipAddress: string;
  userAgent: string | null;
}

/**
 * A fully-resolved description of the session to mint. Produced by a flow after
 * a factor is proven (and, for login, after the policy decides). `establish` is
 * the only consumer; nothing else builds a session row.
 */
export interface SessionSpec {
  user: SessionUser;
  sessionClass: SessionClass;
  request: SessionRequestMetadata;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
  auditAction?: "login" | "login_passkey";
}

/** The result of issuing a session: the identity it represents and its token. */
export interface IssuedSession {
  userId: UserId;
  role: Role;
  onboardingCompleted: boolean;
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
  token: string;
}

export interface SessionRepositoryPort {
  create(session: {
    id: string;
    user_id: number;
    branch_id: number;
    role: Role;
    session_class: SessionClass;
    primary_auth_method: PrimaryAuthMethod;
    strong_auth_method: StrongAuthMethod | null;
    strong_auth_at: number | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: number;
    last_activity: number;
    expires_at: number;
  }): Promise<void>;
  findById(id: string): Promise<UserSessionRow | null | undefined>;
  updateActivity(id: string, lastActivity: number): Promise<void>;
  extendExpiry(id: string, expiresAt: number): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAllForUser(userId: UserId): Promise<void>;
}

export interface SessionUsersPort {
  findById(
    userId: UserId,
  ): Promise<
    { id: number; is_active: number; expires_at: number | null } | undefined
  >;
  deactivateIfExpired(userId: UserId, now: number): Promise<boolean>;
}

/** Only the audit write `establish` needs; the full repo satisfies it. */
export type SessionAuditPort = Pick<
  ReturnType<typeof createAuditLogsRepo>,
  "create"
>;

export interface SessionServiceDeps {
  sessions: SessionRepositoryPort;
  users: SessionUsersPort;
  auditLogs: SessionAuditPort;
  now?: () => number;
  logger?: {
    error(message: string, meta?: unknown): void;
  };
}

export type { AuthSession };
