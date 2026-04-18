import type { Role } from "~/lib/auth/access/rbac";
import type { ExecutiveCategoryValue } from "~/lib/db/types";
import type { DomainError } from "~/server/shared/domain-error";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

export interface InviteAuditPort {
  create(values: {
    user_id: UserId;
    action: string;
    entity_type: string;
    entity_id: string;
    changes: string | null;
    created_at: number;
  }): Promise<unknown>;
}

export interface InviteUsersPort {
  findById(id: UserId): Promise<
    | {
        id: UserId;
        branch_id: BranchId;
        role: Role;
        email: string;
        names: string;
        first_surname: string;
        second_surname: string;
        is_active: number;
      }
    | undefined
  >;
  findByEmail(email: string): Promise<
    | {
        id: UserId;
        branch_id: BranchId;
        role: Role;
        email: string;
        is_active: number;
      }
    | undefined
  >;
  findByUsername(username: string): Promise<{ id: UserId } | undefined>;
  create(values: {
    id: UserId;
    branch_id: BranchId;
    team_id?: TeamId | null;
    username: string;
    email: string;
    password_hash: string;
    names: string;
    first_surname: string;
    second_surname: string;
    expires_at?: number | null;
    phone_e164?: string | null;
    role: Role;
    executive_category?: ExecutiveCategoryValue | null;
    is_active: number;
  }): Promise<UserId>;
  updateInviteProvisioning(
    id: UserId,
    values: {
      team_id: TeamId | null;
      names: string;
      first_surname: string;
      second_surname: string;
      role: Role;
      executive_category?: ExecutiveCategoryValue | null;
      is_active: number;
    },
  ): Promise<unknown>;
  updatePassword(id: UserId, passwordHash: string): Promise<unknown>;
}

export interface InviteTeamsPort {
  findByIdWithSupervisor(id: TeamId): Promise<
    | {
        id: TeamId;
        branch_id: BranchId;
      }
    | undefined
  >;
}

export interface InviteWithUserRecord {
  invite_id: number;
  invite_status: "pending" | "accepted" | "revoked" | "expired";
  invite_expires_at: number;
  invite_created_at: number;
  invite_created_by_user_id: UserId;
  invite_sent_at: number | null;
  user_id: UserId;
  user_email: string;
  user_role: Role;
  user_branch_id: BranchId;
  user_team_id: TeamId | null;
  user_names: string;
  user_first_surname: string;
  user_second_surname: string;
  user_username?: string;
  user_is_active: number;
}

export interface InviteUserInvitesPort {
  create(values: {
    user_id: UserId;
    branch_id: BranchId;
    email: string;
    role: Role;
    token_hash: string;
    status: "pending";
    expires_at: number;
    created_by_user_id: UserId;
    accepted_at: null;
    revoked_at: null;
    created_at: number;
    sent_at: null;
  }): Promise<number>;
  findLatestPendingByBranch(
    branchId: BranchId,
    now: number,
  ): Promise<InviteWithUserRecord[]>;
  findById(inviteId: number): Promise<
    | {
        id: number;
        user_id: UserId;
        branch_id: BranchId;
        status: "pending" | "accepted" | "revoked" | "expired";
        expires_at: number;
      }
    | undefined
  >;
  findPendingByTokenHash(
    tokenHash: string,
    now: number,
  ): Promise<InviteWithUserRecord | undefined>;
  revokePendingByUser(userId: UserId, revokedAt: number): Promise<unknown>;
  expirePendingBefore(now: number): Promise<unknown>;
  markAccepted(inviteId: number, acceptedAt: number): Promise<unknown>;
  markSent(inviteId: number, sentAt: number): Promise<unknown>;
}

export interface InviteDeps {
  users: InviteUsersPort;
  teams: InviteTeamsPort;
  userInvites: InviteUserInvitesPort;
  auditLogs: InviteAuditPort;
}

export interface InviteServiceDeps {
  inviteTtlMs?: number;
  now?: () => number;
  runInTransaction?: <T>(
    operation: (repos: InviteDeps) => Promise<T>,
  ) => Promise<T>;
  hashPassword?: (password: string) => Promise<string>;
}

export interface InviteRuntime {
  now: () => number;
  inviteTtlMs: number;
  runInTransaction: <T>(
    operation: (repos: InviteDeps) => Promise<T>,
  ) => Promise<T>;
  hashPassword: (password: string) => Promise<string>;
}

export interface PendingBranchInvite {
  inviteId: number;
  userId: UserId;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  role: Role;
  teamId: TeamId | null;
  expiresAt: number;
  createdAt: number;
  createdByUserId: UserId;
  sentAt: number | null;
}

export interface CreateInviteInput {
  actorUserId: UserId;
  actorRole: Role;
  branchId: BranchId;
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  executiveCategory?: ExecutiveCategoryValue | null;
  teamId: TeamId | null;
  expiresAt?: number | null;
}

export interface ResendInviteInput {
  actorUserId: UserId;
  actorRole: Role;
  branchId: BranchId;
  inviteId: number;
}

export interface RevokeInviteInput {
  actorUserId: UserId;
  actorRole: Role;
  branchId: BranchId;
  inviteId: number;
}

export interface AcceptInviteInput {
  token: string;
  password: string;
}

export interface IssueInviteInput {
  actorUserId: UserId;
  branchId: BranchId;
  userId: UserId;
  email: string;
  role: Role;
  expiresAt?: number | null;
}

export interface InviteIssueResult {
  inviteId: number;
  token: string;
  expiresAt: number;
}

export interface InviteAcceptedResult {
  userId: UserId;
  branchId: BranchId;
  role: Role;
}

export interface InviteService {
  listPendingInvites(
    branchId: BranchId,
  ): Promise<Result<PendingBranchInvite[], DomainError>>;
  createInvite(
    input: CreateInviteInput,
  ): Promise<Result<InviteIssueResult, DomainError>>;
  resendInvite(
    input: ResendInviteInput,
  ): Promise<Result<InviteIssueResult, DomainError>>;
  revokeInvite(input: RevokeInviteInput): Promise<Result<void, DomainError>>;
  markInviteDelivered(inviteId: number): Promise<Result<void, DomainError>>;
  acceptInvite(
    input: AcceptInviteInput,
  ): Promise<Result<InviteAcceptedResult, DomainError>>;
}

export interface TeamInviteReadTeamsPort {
  findByBranch(
    branchId: BranchId,
  ): Promise<Array<{ id: TeamId; name: string }>>;
}

export interface TeamInviteReadUsersPort {
  findById(id: UserId): Promise<
    | {
        id: UserId;
        email: string;
        role: Role;
        names: string;
        first_surname: string;
        second_surname: string;
      }
    | undefined
  >;
}

export interface TeamInviteReadUserInvitesPort {
  findById(inviteId: number): Promise<{ user_id: UserId } | undefined>;
  findPendingByTokenHash(
    tokenHash: string,
    now: number,
  ): Promise<
    | {
        user_names: string;
        user_first_surname: string;
        user_second_surname: string;
        user_username: string;
        user_email: string;
      }
    | undefined
  >;
}

export interface TeamInviteReadRepos {
  teams: TeamInviteReadTeamsPort;
  userInvites: TeamInviteReadUserInvitesPort;
  users: TeamInviteReadUsersPort;
}
