"use server";

import { action } from "@solidjs/router";
import { db } from "~/server/db/client";
import { requireRole } from "~/server/auth/session";

const DEFAULT_BUFFER_SIZE = 10;
const ASSIGNMENT_TTL = 24 * 60 * 60 * 1000;

async function requestUnassignedLeadsFromEngine(limit: number) {
  const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:5000";
  const response = await fetch(`${ENGINE_URL}/leads/unassigned?limit=${limit}`);
  return await response.json();
}

async function markLeadsAssignedInEngine(leadIds: number[], userId: number) {
  const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:5000";
  await fetch(`${ENGINE_URL}/leads/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadIds, userId }),
  });
}

export const requestLeadsAction = action(async (formData: FormData) => {
  "use server";
  const { userId } = await requireRole(["executive"]);
  const bufferSize = Number(formData.get("bufferSize")) || DEFAULT_BUFFER_SIZE;

  const active = await db
    .selectFrom("lead_assignments")
    .where("user_id", "=", userId)
    .where("status", "=", "Active")
    .selectAll()
    .execute();

  const needed = bufferSize - active.length;
  if (needed <= 0) return [];

  const leads = await requestUnassignedLeadsFromEngine(needed);
  const now = Date.now();
  const expiresAt = now + ASSIGNMENT_TTL;

  const assignments = (leads as any[]).map((lead) => ({
    user_id: userId,
    contact_id: lead.id,
    assigned_at: now,
    expires_at: expiresAt,
    status: "Active" as const,
  }));

  await db.insertInto("lead_assignments").values(assignments).execute();
  await markLeadsAssignedInEngine(
    (leads as any[]).map((l) => l.id),
    userId,
  );

  return leads;
}, "requestLeads");

export const completeLeadAction = action(async (formData: FormData) => {
  "use server";
  const { userId } = await requireRole(["executive"]);
  const assignmentId = Number(formData.get("assignmentId"));

  await db
    .updateTable("lead_assignments")
    .set({ status: "Completed" })
    .where("id", "=", assignmentId)
    .where("user_id", "=", userId)
    .execute();

  return { success: true };
}, "completeLead");
