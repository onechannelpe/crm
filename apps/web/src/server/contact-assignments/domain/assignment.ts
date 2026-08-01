import type { ContactAssignmentStatus } from "~/contracts/contact-assignments/vocabulary";
import type { OrganizationPersonId, UserId } from "~/domain/ids";
import { addMilliseconds } from "~/domain/time/clock";

const DEFAULT_ASSIGNMENT_TTL_HOURS = 24;

export type ContactAssignmentDraft = {
  user_id: UserId;
  contact_id: OrganizationPersonId;
  assigned_at: Date;
  expires_at: Date;
  status: ContactAssignmentStatus;
};

export function createAssignment(
  userId: UserId,
  contactId: OrganizationPersonId,
  assignedAt: Date,
  ttlHours: number = DEFAULT_ASSIGNMENT_TTL_HOURS,
): ContactAssignmentDraft {
  return {
    user_id: userId,
    contact_id: contactId,
    assigned_at: assignedAt,
    expires_at: addMilliseconds(assignedAt, ttlHours * 60 * 60 * 1000),
    status: "active",
  };
}
