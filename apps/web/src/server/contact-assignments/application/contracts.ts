import type { Role } from "~/lib/auth/access/rbac";
import type { ActionSuccess } from "~/lib/contracts/common";
import type { BranchId, OrganizationId, UserId } from "~/server/shared/ids";

type AssignmentStatus = "active" | "completed" | "expired";

type CallOutcome =
  | "no_answer"
  | "callback_scheduled"
  | "sale_made"
  | "invalid_data";

export interface AssignContactsCommand {
  actorUserId: UserId;
  branchId: BranchId;
}

export interface AssignContactsResult {
  requested: number;
  assigned: number;
}

export type CompleteContactAssignmentCallResult = ActionSuccess;

export type CompleteContactAssignmentCallCommand = {
  actorUserId: UserId;
  actorRole: Role;
  branchId: BranchId;
  assignmentId: number;
  contactId: number;
  outcome: CallOutcome;
  notes: string | null;
};

export type ActiveContactAssignmentView = {
  assignmentId: number;
  assignedAt: number;
  expiresAt: number;
  status: AssignmentStatus;
  contactId: number;
  name: string;
  dni: string;
  phonePrimary: string | null;
  organizationId: OrganizationId;
};
