import type { ActionSuccess } from "~/contracts/common";
import type { ContactAssignmentCallOutcome } from "~/contracts/contact-assignments/vocabulary";
import type {
  BranchId,
  ContactAssignmentId,
  OrganizationPersonId,
  UserId,
} from "~/server/shared/ids";

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
  assignmentId: ContactAssignmentId;
  contactId: OrganizationPersonId;
  outcome: ContactAssignmentCallOutcome;
  notes: string | null;
};
