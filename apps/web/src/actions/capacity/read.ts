"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { capacityReadService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { fromCapacityReadError, throwCapacityActionError } from "./errors";

export async function getManagedExecutives() {
  const session = await requirePermission("capacity:read:team");
  const result = await capacityReadService.listManagedExecutives(session);
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityReadError(result.error));
  }
  return result.value;
}

export async function getExecutiveCapacityDetail(userId: number) {
  const safeUserId = assertPositiveInt(userId, "userId");
  const session = await requirePermission("capacity:read:team");
  const result = await capacityReadService.getExecutiveCapacityDetail(
    session,
    safeUserId,
  );
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityReadError(result.error));
  }
  return result.value;
}

export async function getPendingCapacityRequests() {
  const session = await requirePermission("capacity:read:team");
  const result = await capacityReadService.listPendingCapacityRequests(session);
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityReadError(result.error));
  }
  return result.value;
}

export async function getCapacityPolicyDefaults() {
  const session = await requirePermission("capacity:policy:manage");
  const result = await capacityReadService.getCapacityPolicyDefaults(session);
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityReadError(result.error));
  }
  return result.value;
}

export async function getCapacityAuditEvents(limit?: number) {
  const session = await requirePermission("capacity:audit:read");
  const safeLimit =
    limit == null ? undefined : assertPositiveInt(limit, "limit");
  const result = await capacityReadService.listCapacityAuditEvents(
    session,
    safeLimit,
  );
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityReadError(result.error));
  }
  return result.value;
}
