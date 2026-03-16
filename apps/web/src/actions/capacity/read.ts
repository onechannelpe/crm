"use server";

import { requirePermission } from "~/lib/auth/access/session";
import type { CapacityReadError } from "~/server/capacity/read-service";
import { capacityReadService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { throwCapacityActionError } from "./errors";

function toCapacityActionError(error: CapacityReadError) {
  if (error.reason === "forbidden") {
    return { reason: "forbidden" as const, message: error.message };
  }
  if (error.reason === "not_found") {
    return { reason: "not_found" as const, message: error.message };
  }
  return { reason: "unexpected" as const, message: error.message };
}

export async function getManagedExecutives() {
  const session = await requirePermission("capacity:read:team");
  const result = await capacityReadService.listManagedExecutives(session);
  if (isErr(result)) {
    throwCapacityActionError(toCapacityActionError(result.error));
  }
  return result.value;
}

export async function getExecutiveCapacityDetail(userId: number) {
  const session = await requirePermission("capacity:read:team");
  const result = await capacityReadService.getExecutiveCapacityDetail(
    session,
    userId,
  );
  if (isErr(result)) {
    throwCapacityActionError(toCapacityActionError(result.error));
  }
  return result.value;
}

export async function getPendingCapacityRequests() {
  const session = await requirePermission("capacity:read:team");
  const result = await capacityReadService.listPendingCapacityRequests(session);
  if (isErr(result)) {
    throwCapacityActionError(toCapacityActionError(result.error));
  }
  return result.value;
}

export async function getCapacityPolicyDefaults() {
  const session = await requirePermission("capacity:policy:manage");
  const result = await capacityReadService.getCapacityPolicyDefaults(session);
  if (isErr(result)) {
    throwCapacityActionError(toCapacityActionError(result.error));
  }
  return result.value;
}

export async function getCapacityAuditEvents(limit?: number) {
  const session = await requirePermission("capacity:audit:read");
  const result = await capacityReadService.listCapacityAuditEvents(
    session,
    limit,
  );
  if (isErr(result)) {
    throwCapacityActionError(toCapacityActionError(result.error));
  }
  return result.value;
}
