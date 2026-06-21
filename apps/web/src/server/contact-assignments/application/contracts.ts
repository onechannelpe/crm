import type { ActionSuccess } from "~/contracts/common";
import type { CompleteContactAssignmentCallInput } from "~/contracts/contact-assignments/inputs";
import type { BranchId, UserId } from "~/server/shared/ids";

export interface AssignContactsCommand {
  actorUserId: UserId;
  branchId: BranchId;
}

export interface AssignContactsResult {
  requested: number;
  assigned: number;
}

export type CompleteContactAssignmentCallResult = ActionSuccess;

export type CompleteContactAssignmentCallCommand =
  CompleteContactAssignmentCallInput & {
    actorUserId: UserId;
  };
