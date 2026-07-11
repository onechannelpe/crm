import type { ContactAssignmentStatus } from "./vocabulary";

export type ActiveContactAssignmentView = {
  assignmentId: string;
  assignedAt: number;
  expiresAt: number;
  status: ContactAssignmentStatus;
  contactId: string;
  name: string;
  dni: string;
  phonePrimary: string | null;
  organizationId: string;
};
