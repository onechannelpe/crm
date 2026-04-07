import type { Role } from "~/lib/auth/access/rbac";
import type { ActionSuccess } from "~/lib/contracts/common";
import type { BranchId, UserId } from "~/server/shared/ids";

export type CompleteContactAssignmentCallResult = ActionSuccess & {
  draftRecordId: number | null;
};

export type CompleteContactAssignmentCallCommand = {
  actorUserId: UserId;
  actorRole: Role;
  branchId: BranchId;
  assignmentId: number;
  contactId: number;
  outcome: string;
  notes: string | null;
};
