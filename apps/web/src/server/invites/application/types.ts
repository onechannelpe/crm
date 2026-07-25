import type { Role } from "~/domain/auth/access/rbac";
import type { DomainError } from "~/domain/errors";
import type { ExecutiveCategory } from "~/domain/identity/executive-category";
import type { BranchId, TeamId, UserId, UserInviteId } from "~/domain/ids";
import type { EventsRepo } from "~/server/event-logs/events-repo";
import type { AppUow } from "~/server/platform/database/uow";
import type { TeamsRepo } from "~/server/users/repos-teams";
import type { UserInvitesRepo } from "~/server/users/repos-user-invites";
import type { UsersRepo } from "~/server/users/repos-users";
import type { Result } from "~/shared/result";

export interface InviteDeps {
  users: Pick<
    UsersRepo,
    | "findById"
    | "findByEmail"
    | "findByUsername"
    | "create"
    | "updateInviteProvisioning"
    | "updatePassword"
  >;
  teams: Pick<TeamsRepo, "findById">;
  userInvites: Pick<
    UserInvitesRepo,
    | "create"
    | "findLatestPendingByBranch"
    | "findById"
    | "findPendingByToken"
    | "revokePendingByUser"
    | "refreshExpiry"
    | "markAccepted"
    | "markDelivered"
  >;
  events: Pick<EventsRepo, "append">;
}

export interface InviteServiceDeps {
  inviteTtlMs?: number;
  now: () => Date;
  uow: AppUow<InviteDeps>;
  hashPassword?: (password: string) => Promise<string>;
}

export interface InviteRuntime {
  now: () => Date;
  inviteTtlMs: number;
  uow: AppUow<InviteDeps>;
  hashPassword: (password: string) => Promise<string>;
}

export interface PendingBranchInvite {
  inviteId: UserInviteId;
  userId: UserId;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  role: Role;
  teamId: TeamId | null;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  createdByUserId: UserId;
  lastDeliveredAt: Date | null;
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
  executiveCategory?: ExecutiveCategory | null;
  teamId: TeamId | null;
  expiresAt?: Date | null;
}

export interface RedeliverInviteInput {
  actorUserId: UserId;
  actorRole: Role;
  branchId: BranchId;
  inviteId: UserInviteId;
}

export interface RevokeInviteInput {
  actorUserId: UserId;
  actorRole: Role;
  branchId: BranchId;
  inviteId: UserInviteId;
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
  expiresAt?: Date | null;
}

export interface InviteIssueResult {
  inviteId: UserInviteId;
  token: string;
  expiresAt: Date;
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
  redeliverInvite(
    input: RedeliverInviteInput,
  ): Promise<Result<InviteIssueResult, DomainError>>;
  revokeInvite(input: RevokeInviteInput): Promise<Result<void, DomainError>>;
  markInviteDelivered(
    inviteId: UserInviteId,
  ): Promise<Result<void, DomainError>>;
  acceptInvite(
    input: AcceptInviteInput,
  ): Promise<Result<InviteAcceptedResult, DomainError>>;
}

export interface TeamInviteReadRepos {
  teams: Pick<TeamsRepo, "findByBranch">;
  userInvites: Pick<UserInvitesRepo, "findById" | "findPendingByToken">;
  users: Pick<UsersRepo, "findById">;
}
