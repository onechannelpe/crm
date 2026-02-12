import { QuotaRepository } from "~/infrastructure/db/repositories/quota";
import { LeadsRepository } from "~/infrastructure/db/repositories/leads";
import { OrganizationsRepository } from "~/infrastructure/db/repositories/organizations";
import { ContactsRepository } from "~/infrastructure/db/repositories/contacts";
import { SearcherClient } from "~/infrastructure/searcher/client";
import { consumeQuota } from "~/domain/quota/consumption";
import { canConsumeQuota, todayDateString } from "~/domain/quota/types";
import { createAssignment } from "~/domain/leads/assignment";
import { canLockOrganization, lockOrganization } from "~/domain/leads/org-lock";
import { canContactNow } from "~/domain/leads/cooldown";
import type { Result } from "~/domain/shared/result";
import { Ok, Err, isOk } from "~/domain/shared/result";
import { config } from "~/shared/config";

export async function requestLeads(
  userId: number,
  branchId: number,
  bufferSize: number = config.leadAssignment.defaultBufferSize,
): Promise<Result<number, Error>> {
  const today = todayDateString();
  const quota = await QuotaRepository.getTodayQuota(userId, today);

  if (!quota) {
    return Err(new Error("No quota allocated for today"));
  }

  if (!canConsumeQuota(quota, bufferSize)) {
    return Err(new Error(`Insufficient quota: ${quota.usedAmount}/${quota.quotaAmount} used`));
  }

  const currentCount = await LeadsRepository.countActiveByUser(userId);
  const needed = Math.max(0, bufferSize - currentCount);

  if (needed === 0) {
    return Ok(0);
  }

  const response = await SearcherClient.getUnassigned(needed);
  const validLeads = [];

  for (const lead of response.leads) {
    if (!lead.org_ruc) continue;

    const org = await OrganizationsRepository.findByRuc(lead.org_ruc);
    const lockCheck = canLockOrganization(org, branchId);

    if (!isOk(lockCheck)) continue;

    const contact = await ContactsRepository.findByDni(lead.dni);
    if (contact) {
      const cooldownCheck = canContactNow(contact);
      if (!isOk(cooldownCheck)) continue;
    }

    validLeads.push(lead);
  }

  const assignments = [];
  for (const lead of validLeads) {
    const org = await OrganizationsRepository.findOrCreate(lead.org_ruc!, lead.org_name!);
    
    if (!org.locked_branch_id) {
      await OrganizationsRepository.lockToBranch(org.id, branchId, userId);
    }

    const contact = await ContactsRepository.findOrCreate(
      org.id,
      lead.dni,
      lead.name,
      lead.phone_primary,
    );

    const assignment = createAssignment(userId, contact.id);
    assignments.push(assignment);
  }

  await LeadsRepository.createMany(assignments);
  await QuotaRepository.incrementUsage(quota.id, assignments.length);
  await SearcherClient.markAssigned({
    lead_ids: validLeads.map(l => l.id),
    user_id: userId,
    branch_id: branchId,
  });

  return Ok(assignments.length);
}
