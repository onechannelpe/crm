import type { Role } from "~/domain/auth/access/rbac";
import type { BranchId, UserId } from "~/domain/ids";
import type {
  IntegrationJobRow,
  IntegrationRuntime,
} from "~/server/integrations/types";

interface ActorScope {
  userId: UserId;
  branchId: BranchId;
  role: Role;
}

function canBypassBranchScope(role: Role): boolean {
  return role === "admin" || role === "superuser";
}

export async function canAccessRecordImportJob(
  actor: ActorScope,
  job: IntegrationJobRow,
  runtime: IntegrationRuntime,
): Promise<boolean> {
  if (canBypassBranchScope(actor.role)) {
    return true;
  }

  if (job.requested_by_user_id === actor.userId) {
    return true;
  }

  const requester = await runtime.users.findById(job.requested_by_user_id);
  if (!requester) {
    return false;
  }

  return requester.branch_id === actor.branchId;
}
