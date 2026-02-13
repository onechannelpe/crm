import type { NewLeadAssignment } from "~/lib/db/schema";
import { config } from "~/lib/config";

export function createAssignment(
    userId: number,
    contactId: number,
    ttlHours: number = config.leadAssignment.ttlHours,
): NewLeadAssignment {
    const now = Date.now();
    return {
        user_id: userId,
        contact_id: contactId,
        assigned_at: now,
        expires_at: now + ttlHours * 60 * 60 * 1000,
        status: "active",
    };
}

export function isExpired(expiresAt: number, now: number = Date.now()): boolean {
    return now >= expiresAt;
}
