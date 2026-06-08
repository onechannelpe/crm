import type { ActionSuccess } from "~/contracts/common";
import type { ContactAssignmentStatus } from "~/server/contact-assignments/domain/assignment";
import type { BranchId, OrganizationId, UserId } from "~/server/shared/ids";

export const CONTACT_ASSIGNMENT_CALL_OUTCOMES = [
  "no_answer",
  "callback_scheduled",
  "sale_made",
  "invalid_data",
] as const;

export type ContactAssignmentCallOutcome =
  (typeof CONTACT_ASSIGNMENT_CALL_OUTCOMES)[number];

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
  assignmentId: number;
  contactId: number;
  outcome: ContactAssignmentCallOutcome;
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
  organizationId: OrganizationId;
};
