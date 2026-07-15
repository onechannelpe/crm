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
import type { Logger } from "~/lib/observability/logger-shared";
import type { BranchId, UserId } from "~/server/shared/ids";
import type { EventsRepo } from "~/server/shared/repos-events";

type UserRow = Selectable<UsersTable>;

export type SessionUser = Pick<
  UserRow,
  "id" | "branch_id" | "role" | "onboarding_completed_at"
>;

export interface SessionRequestMetadata {
  ipAddress: string;
  userAgent: string | null;
}

export interface SessionSpec {
  user: SessionUser;
  sessionClass: SessionClass;
  request: SessionRequestMetadata;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: Date | null;
  impersonatorUserId?: UserId | null;
  auditAction?: "login" | "login_passkey";
}

export interface IssuedSession {
  userId: UserId;
  role: Role;
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: Date | null;
  token: string;
}

export interface SessionRepositoryPort {
  create(session: {
    id: string;
    user_id: UserId;
    branch_id: BranchId;
    role: Role;
    session_class: SessionClass;
    primary_auth_method: PrimaryAuthMethod;
    strong_auth_method: StrongAuthMethod | null;
    strong_auth_at: Date | null;
    impersonator_user_id: UserId | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
    last_activity: Date;
    expires_at: Date;
  }): Promise<void>;
  findById(id: string): Promise<UserSessionRow | null | undefined>;
  updateActivity(id: string, lastActivity: Date): Promise<void>;
  extendExpiry(id: string, expiresAt: Date): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAllForUser(userId: UserId): Promise<void>;
  deleteOtherForUser(userId: UserId, retainedSessionId: string): Promise<void>;
}

export interface SessionUsersPort {
  findById(
    userId: UserId,
  ): Promise<
    { id: UserId; is_active: boolean; expires_at: Date | null } | undefined
  >;
  deactivateIfExpired(userId: UserId, now: Date): Promise<boolean>;
}

export interface SessionEventPort {
  // Service does not read the return; adapters can return void, an id, or an
  // event count without breaking the contract.
  append(event: Parameters<EventsRepo["append"]>[0]): Promise<unknown>;
}

export interface SessionServiceDeps {
  sessions: SessionRepositoryPort;
  users: SessionUsersPort;
  events: SessionEventPort;
  now?: () => Date;
  logger?: Pick<Logger, "error">;
}

export type { AuthSession };
