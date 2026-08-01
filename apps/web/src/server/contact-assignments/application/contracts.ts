import type { ActionSuccess } from "~/contracts/common";
import type { ContactAssignmentCallOutcome } from "~/contracts/contact-assignments/vocabulary";
import type {
  BranchId,
  ContactAssignmentId,
  OrganizationPersonId,
  UserId,
} from "~/domain/ids";

export interface AssignContactsCommand {
  actorUserId: UserId;
  branchId: BranchId;
  /** Operation instant, shared by the reservation, the assignment rows and the commit. */
  at: Date;
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
  /** Operation instant: bounds the active-assignment check and stamps the log. */
  at: Date;
};
