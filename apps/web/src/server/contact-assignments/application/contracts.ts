import type { Role } from "~/lib/auth/access/rbac";
import type { ActionSuccess } from "~/lib/contracts/common";
import type { BranchId, UserId } from "~/server/shared/ids";

import type { ContactAssignmentStatus } from "../domain/assignment";

export interface AssignContactsCommand {
  actorUserId: UserId;
  branchId: BranchId;
}

export interface AssignContactsResult {
  requested: number;
  assigned: number;
}

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

export type ActiveContactAssignmentView = {
  assignmentId: number;
  assignedAt: number;
  expiresAt: number;
  status: ContactAssignmentStatus;
  contactId: number;
  name: string;
  dni: string;
  phonePrimary: string | null;
  organizationId: number;
};
