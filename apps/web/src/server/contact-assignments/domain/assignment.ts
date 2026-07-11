import type { ContactAssignmentStatus } from "~/contracts/contact-assignments/vocabulary";
import { config } from "~/lib/config";
import type { OrganizationPersonId, UserId } from "~/server/shared/ids";
import { addMilliseconds } from "~/server/shared/time";

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
  ttlHours: number = config.leadAssignment.ttlHours,
): ContactAssignmentDraft {
  const now = new Date();
  return {
    user_id: userId,
    contact_id: contactId,
    assigned_at: now,
    expires_at: addMilliseconds(now, ttlHours * 60 * 60 * 1000),
    status: "active",
  };
}
