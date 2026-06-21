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
import type { UserId } from "~/server/shared/ids";
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
  strongAuthAt: number | null;
  auditAction?: "login" | "login_passkey";
}

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

export interface SessionEventPort {
  append(event: Parameters<EventsRepo["append"]>[0]): Promise<unknown>;
}

export interface SessionServiceDeps {
  sessions: SessionRepositoryPort;
  users: SessionUsersPort;
  events: SessionEventPort;
  now?: () => number;
  logger?: {
    error(message: string, meta?: unknown): void;
  };
}

export type { AuthSession };
