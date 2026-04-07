"use server";

import { assertPositiveInt } from "~/lib/contracts/guards";
import type {
  CapacityAuditEvent,
  CapacityPolicyDefaultsView,
  ExecutiveCapacityDetailView,
  ManagedExecutiveView,
  PendingCapacityRequestView,
} from "~/server/capacity/application/contracts";
import { getAuditEvents as getAuditEventsService } from "~/server/capacity/application/get-audit-events";
import { getExecutiveDetail as getExecutiveDetailService } from "~/server/capacity/application/get-executive-detail";
import { getPolicyDefaults as getPolicyDefaultsService } from "~/server/capacity/application/get-policy-defaults";
import { listManagedExecutives as listManagedExecutivesService } from "~/server/capacity/application/list-managed-executives";
import { listPendingRequests as listPendingRequestsService } from "~/server/capacity/application/list-pending-requests";
import { createCapacityReadContext } from "~/server/capacity/infrastructure/read-context";
import { runAction } from "~/server/shared/action-runtime";

export async function getManagedExecutivesList(): Promise<
  ManagedExecutiveView[]
> {
  return runAction({
    actionName: "capacity.managed_executives.read",
    permission: "capacity:read:team",
    execute: (ctx) =>
      listManagedExecutivesService(ctx, createCapacityReadContext()),
  });
}

export async function getExecutiveDetail(
  userId: number,
): Promise<ExecutiveCapacityDetailView> {
  const safeUserId = assertPositiveInt(userId, "userId");
  return runAction({
    actionName: "capacity.executive_detail.read",
    permission: "capacity:read:team",
    input: { userId: safeUserId },
    execute: (ctx) =>
      getExecutiveDetailService(ctx, createCapacityReadContext(), {
        userId: safeUserId,
      }),
  });
}

export async function getPendingRequests(): Promise<
  PendingCapacityRequestView[]
> {
  return runAction({
    actionName: "capacity.pending_requests.read",
    permission: "capacity:read:team",
    execute: (ctx) =>
      listPendingRequestsService(ctx, createCapacityReadContext()),
  });
}

export async function getPolicyDefaults(): Promise<CapacityPolicyDefaultsView> {
  return runAction({
    actionName: "capacity.policy_defaults.read",
    permission: "capacity:policy:manage",
    execute: (ctx) =>
      getPolicyDefaultsService(ctx, createCapacityReadContext()),
  });
}

export async function getAuditEvents(
  limit?: number,
): Promise<CapacityAuditEvent[]> {
  const safeLimit =
    limit == null ? undefined : assertPositiveInt(limit, "limit");
  return runAction({
    actionName: "capacity.audit.read",
    permission: "capacity:audit:read",
    input: { limit: safeLimit },
    execute: (ctx) =>
      getAuditEventsService(ctx, createCapacityReadContext(), {
        limit: safeLimit,
      }),
  });
}
