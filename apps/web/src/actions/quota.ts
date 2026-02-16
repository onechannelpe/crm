"use server";

import type { ActionSuccess } from "~/lib/contracts/common";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { quotaService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

type QuotaStatus = Awaited<ReturnType<typeof quotaService.getStatus>>;

export async function allocateQuota(
  executiveId: number,
  amount: number,
): Promise<ActionSuccess> {
  const safeExecutiveId = assertPositiveInt(executiveId, "executiveId");
  const safeAmount = assertPositiveInt(amount, "amount");
  const session = await requirePermission("quota:allocate");
  const executive = await repos.users.findById(safeExecutiveId);
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
    safeExecutiveId,
    safeAmount,
  );

  if (isErr(result)) throw new Error(result.error);
  return { success: true };
}

export async function getQuotaStatus(): Promise<QuotaStatus> {
  const session = await requirePermission("quota:read");
  return quotaService.getStatus(session.userId);
}
