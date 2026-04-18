import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

export interface InviteManagementPendingInvite {
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

export interface InviteManagementQueryPort {
  listTeamsByBranch(
    branchId: BranchId,
  ): Promise<Array<{ id: TeamId; name: string }>>;
  listPendingInvites(
    branchId: BranchId,
  ): Promise<Result<InviteManagementPendingInvite[], DomainError>>;
}
