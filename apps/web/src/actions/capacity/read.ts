"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { runAction } from "~/server/shared/action-runtime";
import {
  getAuditEvents as getAuditEventsService,
  getExecutiveDetail as getExecutiveDetailService,
  getPolicyDefaults as getPolicyDefaultsService,
  listManagedExecutives as listManagedExecutivesService,
  listPendingRequests as listPendingRequestsService,
} from "~/server/capacity/service-read";

export async function getManagedExecutivesList() {
  const session = await requirePermission("capacity:read:team");
  return runAction({
    actionName: "capacity.managed_executives.read",
    actor: session,
    execute: listManagedExecutivesService,
  });
}

export async function getExecutiveDetail(userId: number) {
  const safeUserId = assertPositiveInt(userId, "userId");
  const session = await requirePermission("capacity:read:team");
  return runAction({
    actionName: "capacity.executive_detail.read",
    actor: session,
    input: { userId: safeUserId },
    execute: (ctx) => getExecutiveDetailService(ctx, { userId: safeUserId }),
  });
}

export async function getPendingRequests() {
  const session = await requirePermission("capacity:read:team");
  return runAction({
    actionName: "capacity.pending_requests.read",
    actor: session,
    execute: listPendingRequestsService,
  });
}

export async function getPolicyDefaults() {
  const session = await requirePermission("capacity:policy:manage");
  return runAction({
    actionName: "capacity.policy_defaults.read",
    actor: session,
    execute: getPolicyDefaultsService,
  });
}

export async function getAuditEvents(limit?: number) {
  const session = await requirePermission("capacity:audit:read");
  const safeLimit =
    limit == null ? undefined : assertPositiveInt(limit, "limit");
  return runAction({
    actionName: "capacity.audit.read",
    actor: session,
    input: { limit: safeLimit },
    execute: (ctx) => getAuditEventsService(ctx, { limit: safeLimit }),
  });
}
