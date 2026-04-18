import { config } from "~/lib/config";
import {
  createAssignmentId,
  type AssignmentId,
  type ContactId,
  type UserId,
} from "~/server/shared/ids";

export type ContactAssignmentStatus = "active" | "completed" | "expired";

export const CONTACT_ASSIGNMENT_CALL_OUTCOMES = [
  "no_answer",
  "callback_scheduled",
  "sale_made",
  "invalid_data",
] as const;

export type ContactAssignmentCallOutcome =
  (typeof CONTACT_ASSIGNMENT_CALL_OUTCOMES)[number];

export type ContactAssignmentDraft = {
  id: AssignmentId;
  user_id: UserId;
  contact_id: ContactId;
  assigned_at: number;
  expires_at: number;
  status: ContactAssignmentStatus;
};

export function createAssignment(
  userId: UserId,
  contactId: ContactId,
  ttlHours: number = config.leadAssignment.ttlHours,
): ContactAssignmentDraft {
  const now = Date.now();
  return {
    id: createAssignmentId(),
    user_id: userId,
    contact_id: contactId,
    assigned_at: now,
    expires_at: now + ttlHours * 60 * 60 * 1000,
    status: "active",
  };
}

export function isExpired(
  expiresAt: number,
  now: number = Date.now(),
): boolean {
  return now >= expiresAt;
}
