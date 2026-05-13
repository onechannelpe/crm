import type { Role } from "~/lib/auth/access/rbac";
import type { ActionSuccess } from "~/lib/contracts/common";
import type { BranchId, OrganizationId, UserId } from "~/server/shared/ids";

export type AssignmentStatus = "active" | "completed" | "expired";

export type ContactAssignmentCallOutcome =
  | "no_answer"
  | "callback_scheduled"
  | "sale_made"
  | "invalid_data";

export const CONTACT_ASSIGNMENT_CALL_OUTCOMES: ReadonlyArray<ContactAssignmentCallOutcome> =
  ["no_answer", "callback_scheduled", "sale_made", "invalid_data"];

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
  assignmentId: number;
  contactId: number;
  outcome: ContactAssignmentCallOutcome;
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
