import type { LeadAssignment } from "./types";

const DEFAULT_TTL_HOURS = 24;

export function createAssignment(
  userId: number,
  contactId: number,
  ttlHours: number = DEFAULT_TTL_HOURS,
): Omit<LeadAssignment, "id"> {
  const now = Date.now();
  return {
    userId,
    contactId,
    assignedAt: now,
    expiresAt: now + ttlHours * 60 * 60 * 1000,
    status: "Active",
  };
}

export function isExpired(assignment: LeadAssignment, now: number = Date.now()): boolean {
  return now >= assignment.expiresAt;
}

export function isActive(assignment: LeadAssignment): boolean {
  return assignment.status === "Active" && !isExpired(assignment);
}
