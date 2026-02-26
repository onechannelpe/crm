"use server";

import {
  appErrorFromMessage,
  conflictError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { appNotificationCenter } from "~/server/shared/context";
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
  if (!executive) throw notFoundError("Executive not found");
  if (executive.role !== "executive")
    throw validationError("Quota can only be allocated to executive users");
  if (
    session.role !== "superuser" &&
    executive.branch_id !== session.branchId
  ) {
    throw conflictError("Cannot allocate quota across branches");
  }

  const result = await quotaService.allocate(
    session.userId,
    safeExecutiveId,
    safeAmount,
  );

  if (isErr(result)) throw appErrorFromMessage(result.error);
  await appNotificationCenter.notifyUsers([safeExecutiveId], {
    type: "quota.assigned",
    title: "Nueva cuota asignada",
    bodyText: `Tu supervisor te asigno ${safeAmount} leads para hoy.`,
    actionUrl: "/sales/leads",
    priority: "normal",
    dedupeKey: `quota.assigned:${safeExecutiveId}:${new Date().toISOString().slice(0, 10)}`,
    metadata: { executiveId: safeExecutiveId, amount: safeAmount },
  });
  return { success: true };
}

export async function getQuotaStatus(): Promise<QuotaStatus> {
  const session = await requirePermission("quota:read");
  return quotaService.getStatus(session.userId);
}
