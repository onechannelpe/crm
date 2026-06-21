import type { ContactAssignmentStatus } from "./vocabulary";

export type ActiveContactAssignmentView = {
  assignmentId: number;
  assignedAt: number;
  expiresAt: number;
  status: ContactAssignmentStatus;
  contactId: number;
  name: string;
  dni: string;
  phonePrimary: string | null;
  organizationId: string;
};
