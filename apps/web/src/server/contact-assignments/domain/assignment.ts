import type { ContactAssignmentStatus } from "~/contracts/contact-assignments/vocabulary";
import { config } from "~/lib/config";

export type ContactAssignmentDraft = {
  user_id: number;
  contact_id: number;
  assigned_at: number;
  expires_at: number;
  status: ContactAssignmentStatus;
};

export function createAssignment(
  userId: number,
  contactId: number,
  ttlHours: number = config.leadAssignment.ttlHours,
): ContactAssignmentDraft {
  const now = Date.now();
  return {
    user_id: userId,
    contact_id: contactId,
    assigned_at: now,
    expires_at: now + ttlHours * 60 * 60 * 1000,
    status: "active",
  };
}
