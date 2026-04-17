import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

export interface InviteManagementPendingInvite {
  inviteId: number;
  userId: UserId;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  role: Role;
  teamId: number | null;
  expiresAt: number;
  createdAt: number;
  createdByUserId: UserId;
  sentAt: number | null;
}

export interface InviteManagementQueryPort {
  listTeamsByBranch(
    branchId: number,
  ): Promise<Array<{ id: number; name: string }>>;
  listPendingInvites(
    branchId: number,
  ): Promise<Result<InviteManagementPendingInvite[], DomainError>>;
}
