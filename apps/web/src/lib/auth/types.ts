import type { Insertable, Selectable } from "kysely";

import type { Database, UsersTable } from "~/lib/db/types";
import type { BranchId, UserId } from "~/server/shared/ids";

import type { Role } from "./access/rbac";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "./core/session-contract";
import type {
  StrongAuthPasskeysPort,
  StrongAuthTotpFactorsPort,
} from "./security/strong-auth-status";

export type NewUserSessionRow = Insertable<Database["user_sessions"]>;
export type UserSessionRow = Selectable<Database["user_sessions"]>;

export interface AuthContextUsersPort {
  findById(userId: UserId): Promise<Selectable<UsersTable> | undefined>;
  deactivateIfExpired(userId: UserId, now: Date): Promise<boolean>;
}

export interface AuthContextDeps {
  users: AuthContextUsersPort;
  passkeys: StrongAuthPasskeysPort;
  userTotpFactors: StrongAuthTotpFactorsPort;
  userRecoveryCodes: {
    getActiveSet(
      userId: UserId,
    ): Promise<{ acknowledgedAt: Date | null } | null>;
  };
}

export interface SessionRepositoryPort {
  create(session: NewUserSessionRow): Promise<void>;
  findById(id: string): Promise<UserSessionRow | null | undefined>;
  updateActivity(id: string, lastActivity: Date): Promise<void>;
  extendExpiry(id: string, expiresAt: Date): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAllForUser(userId: UserId): Promise<void>;
}

export interface SessionUsersPort {
  findById(
    userId: UserId,
  ): Promise<
    { id: UserId; is_active: boolean; expires_at: Date | null } | undefined
  >;
  deactivateIfExpired(userId: UserId, now: Date): Promise<boolean>;
}

export interface SessionDeps {
  sessions?: SessionRepositoryPort;
  users?: SessionUsersPort;
}

export interface CreateSessionParams {
  userId: UserId;
  branchId: BranchId;
  role: Role;
  sessionClass: SessionClass;
  ipAddress: string | null;
  userAgent: string | null;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: Date | null;
}
