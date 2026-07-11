import type { ContactAssignmentCallOutcome } from "./vocabulary";

export type CompleteContactAssignmentCallInput = {
  assignmentId: string;
  contactId: string;
  outcome: ContactAssignmentCallOutcome;
  notes: string | null;
};
