import type { Role } from "~/lib/auth/access/rbac";
import type { ExecutiveCategoryValue } from "~/lib/db/types";
import type { AppUow } from "~/server/shared/application/uow";
import type { DomainError } from "~/server/shared/domain-error";
import type {
  BranchId,
  TeamId,
  UserId,
  UserInviteId,
} from "~/server/shared/ids";
import type { EventsRepo } from "~/server/shared/repos-events";
import type { Result } from "~/server/shared/result";
import type { TeamsRepo } from "~/server/users/repos-teams";
import type { UserInvitesRepo } from "~/server/users/repos-user-invites";
import type { UsersRepo } from "~/server/users/repos-users";

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
  executiveCategory?: ExecutiveCategoryValue | null;
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
