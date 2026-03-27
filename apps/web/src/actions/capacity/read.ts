"use server";

import { assertPositiveInt } from "~/lib/contracts/guards";
import {
  getAuditEvents as getAuditEventsService,
  getExecutiveDetail as getExecutiveDetailService,
  getPolicyDefaults as getPolicyDefaultsService,
  listManagedExecutives as listManagedExecutivesService,
  listPendingRequests as listPendingRequestsService,
} from "~/server/capacity/service-read";
import { runAction } from "~/server/shared/action-runtime";

export async function getManagedExecutivesList() {
  return runAction({
    actionName: "capacity.managed_executives.read",
    permission: "capacity:read:team",
    execute: listManagedExecutivesService,
  });
}

export async function getExecutiveDetail(userId: number) {
  const safeUserId = assertPositiveInt(userId, "userId");
  return runAction({
    actionName: "capacity.executive_detail.read",
    permission: "capacity:read:team",
    input: { userId: safeUserId },
    execute: (ctx) => getExecutiveDetailService(ctx, { userId: safeUserId }),
  });
}

export async function getPendingRequests() {
  return runAction({
    actionName: "capacity.pending_requests.read",
    permission: "capacity:read:team",
    execute: listPendingRequestsService,
  });
}

export async function getPolicyDefaults() {
  return runAction({
    actionName: "capacity.policy_defaults.read",
    permission: "capacity:policy:manage",
    execute: getPolicyDefaultsService,
  });
}

export async function getAuditEvents(limit?: number) {
  const safeLimit =
    limit == null ? undefined : assertPositiveInt(limit, "limit");
  return runAction({
    actionName: "capacity.audit.read",
    permission: "capacity:audit:read",
    input: { limit: safeLimit },
    execute: (ctx) => getAuditEventsService(ctx, { limit: safeLimit }),
  });
}
