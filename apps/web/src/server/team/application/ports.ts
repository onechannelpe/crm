import type { Role } from "~/lib/auth/access/rbac";
import type { PendingBranchInvite } from "~/server/invites/application/types";
import type { DomainError } from "~/server/shared/domain-error";
import type { BranchId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

export interface InviteManagementQueryPort {
  listTeamsByBranch(
    branchId: BranchId,
  ): Promise<Array<{ id: string; name: string }>>;
  listPendingInvites(
    branchId: BranchId,
  ): Promise<Result<PendingBranchInvite[], DomainError>>;
}
