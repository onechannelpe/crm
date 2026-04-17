import type { Role } from "~/lib/auth/access/rbac";
import type { ActionSuccess } from "~/lib/contracts/common";
import type {
  AssignmentId,
  BranchId,
  ContactId,
  OrganizationId,
  UserId,
} from "~/server/shared/ids";

export type { BranchId, UserId };

type AssignmentStatus = "active" | "completed" | "expired";

type CallOutcome =
  | "no_answer"
  | "callback_scheduled"
  | "sale_made"
  | "invalid_data";

export const CONTACT_ASSIGNMENT_CALL_OUTCOMES: ReadonlyArray<CallOutcome> = [
  "no_answer",
  "callback_scheduled",
  "sale_made",
  "invalid_data",
];

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
  assignmentId: AssignmentId;
  contactId: ContactId;
  outcome: CallOutcome;
  notes: string | null;
};

export type ActiveContactAssignmentView = {
  assignmentId: AssignmentId;
  assignedAt: number;
  expiresAt: number;
  status: AssignmentStatus;
  contactId: ContactId;
  name: string;
  dni: string;
  phonePrimary: string | null;
  organizationId: OrganizationId;
};
