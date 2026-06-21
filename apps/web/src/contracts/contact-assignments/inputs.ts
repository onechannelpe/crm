import type { ContactAssignmentCallOutcome } from "./vocabulary";

export type CompleteContactAssignmentCallInput = {
  assignmentId: number;
  contactId: number;
  outcome: ContactAssignmentCallOutcome;
  notes: string | null;
};
