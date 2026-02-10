import { db } from "../../db/client";
import { markLeadsAssigned, requestUnassignedLeads } from "./engine-client";

interface Lead {
  id: number;
  [key: string]: unknown;
}

const DEFAULT_BUFFER_SIZE = 10;
const ASSIGNMENT_TTL = 24 * 60 * 60 * 1000;

export async function getActiveAssignments(userId: number) {
  return await db
    .selectFrom("lead_assignments")
    .where("user_id", "=", userId)
    .where("status", "=", "Active")
    .selectAll()
    .execute();
}

export async function assignLeads(userId: number, bufferSize?: number) {
  const active = await getActiveAssignments(userId);
  const needed = (bufferSize || DEFAULT_BUFFER_SIZE) - active.length;

  if (needed <= 0) return [];

  const leads = await requestUnassignedLeads(needed);
  const now = Date.now();
  const expiresAt = now + ASSIGNMENT_TTL;

  const assignments = (leads as Lead[]).map((lead) => ({
    user_id: userId,
    contact_id: lead.id,
    assigned_at: now,
    expires_at: expiresAt,
    status: "Active" as const,
  }));

  await db.insertInto("lead_assignments").values(assignments).execute();
  await markLeadsAssigned(
    (leads as Lead[]).map((l) => l.id),
    userId,
  );

  return leads;
}

export async function completeAssignment(assignmentId: number, userId: number) {
  await db
    .updateTable("lead_assignments")
    .set({ status: "Completed" })
    .where("id", "=", assignmentId)
    .where("user_id", "=", userId)
    .execute();
}
