"use server";

import { quotaService } from "~/server/shared/context";
import { requirePermission } from "~/lib/auth/session";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export async function allocateQuota(executiveId: number, amount: number) {
  const session = await requirePermission("quota:allocate");
  const executive = await repos.users.findById(executiveId);
  if (!executive) throw new Error("Executive not found");
  if (executive.role !== "executive")
    throw new Error("Quota can only be allocated to executive users");
  if (
    session.role !== "superuser" &&
    executive.branch_id !== session.branchId
  ) {
    throw new Error("Cannot allocate quota across branches");
  }

  const result = await quotaService.allocate(
    session.userId,
    executiveId,
    amount,
  );

  if (isErr(result)) throw new Error(result.error);
  return { success: true };
}

export async function getQuotaStatus() {
  const session = await requirePermission("quota:read");
  return quotaService.getStatus(session.userId);
}
