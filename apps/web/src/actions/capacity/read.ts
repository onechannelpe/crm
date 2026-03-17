"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import {
  getCapacityAuditEvents,
  getCapacityPolicyDefaults,
  getExecutiveCapacityDetail,
  getManagedExecutives,
  getPendingCapacityRequests,
} from "~/server/capacity-admin/read-capacity";
import { repos } from "~/server/shared/context";
import { asUserId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { mapCapacityError } from "./errors";

export async function getManagedExecutivesList() {
  const session = await requirePermission("capacity:read:team");
  const result = await getManagedExecutives(session, repos);
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function getExecutiveDetail(userId: number) {
  const safeUserId = asUserId(assertPositiveInt(userId, "userId"));
  const session = await requirePermission("capacity:read:team");
  const result = await getExecutiveCapacityDetail(session, safeUserId, repos);
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function getPendingRequests() {
  const session = await requirePermission("capacity:read:team");
  const result = await getPendingCapacityRequests(session, repos);
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function getPolicyDefaults() {
  const session = await requirePermission("capacity:policy:manage");
  const result = await getCapacityPolicyDefaults(session, repos);
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function getAuditEvents(limit?: number) {
  const session = await requirePermission("capacity:audit:read");
  const safeLimit =
    limit == null ? undefined : assertPositiveInt(limit, "limit");
  const result = await getCapacityAuditEvents(session, repos, safeLimit);
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}
