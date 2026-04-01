import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

export interface InviteManagementPendingInvite {
  inviteId: number;
  userId: number;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  role:
    | "executive"
    | "supervisor"
    | "back_office"
    | "sales_manager"
    | "logistics"
    | "hr"
    | "admin"
    | "superuser";
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
