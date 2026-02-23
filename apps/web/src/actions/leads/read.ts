"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";

type ActiveLead = Awaited<
  ReturnType<typeof repos.leadAssignments.findActiveByUserWithContacts>
>[number];

export async function getActiveLeads(): Promise<ActiveLead[]> {
  const session = await requirePermission("leads:read");
  return repos.leadAssignments.findActiveByUserWithContacts(session.userId);
}
