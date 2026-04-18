import type { Role } from "~/lib/auth/access/rbac";
import type { AuthSession } from "~/lib/auth/access/session-types";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";
import type { HydratedUserSessionRow } from "~/lib/auth/types";
import type { BranchId, UserId } from "~/server/shared/ids";

export interface SessionRepositoryPort {
  create(session: {
    id: string;
    user_id: UserId;
    branch_id: BranchId;
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
  findById(id: string): Promise<HydratedUserSessionRow | null | undefined>;
  updateActivity(id: string, lastActivity: number): Promise<void>;
  extendExpiry(id: string, expiresAt: number): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAllForUser(userId: UserId): Promise<void>;
}

export interface SessionUsersPort {
  findById(
    userId: UserId,
  ): Promise<
    { id: UserId; is_active: number; expires_at: number | null } | undefined
  >;
  deactivateIfExpired(userId: UserId, now: number): Promise<boolean>;
}

export interface SessionServiceDeps {
  sessions: SessionRepositoryPort;
  users: SessionUsersPort;
  now?: () => number;
  logger?: {
    error(message: string, meta?: unknown): void;
  };
}

export interface CreateSessionInput {
  userId: UserId;
  branchId: BranchId;
  role: Role;
  sessionClass: SessionClass;
  ipAddress: string | null;
  userAgent: string | null;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
}

export interface SessionValidationResult {
  session: AuthSession | null;
}
