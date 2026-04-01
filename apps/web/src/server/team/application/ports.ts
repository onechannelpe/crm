import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

export interface InviteManagementPendingInvite {
  inviteId: number;
  userId: number;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  role: Role;
  teamId: number | null;
  expiresAt: number;
  createdAt: number;
  createdByUserId: number;
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
