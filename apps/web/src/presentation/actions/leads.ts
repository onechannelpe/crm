"use server";

import { revalidate } from "@solidjs/router";
import { requestLeads as requestLeadsCommand } from "~/application/leads/request-leads";
import { completeLead as completeLeadCommand } from "~/application/leads/complete-lead";
import { LeadsRepository } from "~/infrastructure/db/repositories/leads";
import { ContactsRepository } from "~/infrastructure/db/repositories/contacts";
import { getAuthSession } from "~/infrastructure/auth/session";

export async function getActiveLeads() {
  const session = await getAuthSession();
  const userId = session.data.userId;

  if (!userId) {
    return [];
  }

  const assignments = await LeadsRepository.getActiveByUser(userId);
  const contactIds = assignments.map(a => a.contact_id);
  const contacts = await ContactsRepository.findByIds(contactIds);

  return contacts;
}

export async function requestLeads() {
  const session = await getAuthSession();
  const userId = session.data.userId;
  const branchId = session.data.branchId;

  if (!userId || !branchId) {
    throw new Error("Usuario no autenticado");
  }

  await requestLeadsCommand({ userId, branchId });
  revalidate(getActiveLeads.key);
}

export async function completeLead(contactId: number) {
  const session = await getAuthSession();
  const userId = session.data.userId;

  if (!userId) {
    throw new Error("Usuario no autenticado");
  }

  await completeLeadCommand({ userId, contactId });
  revalidate(getActiveLeads.key);
}
