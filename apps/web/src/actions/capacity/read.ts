"use server";

import type {
  CapacityAuditEvent,
  CapacityPolicyDefaultsView,
  ExecutiveCapacityDetailView,
  ManagedExecutiveView,
  PendingCapacityRequestView,
} from "~/actions/capacity/contracts";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { getAuditEvents as getAuditEventsService } from "~/server/capacity/application/get-audit-events";
import { getExecutiveDetail as getExecutiveDetailService } from "~/server/capacity/application/get-executive-detail";
import { getPolicyDefaults as getPolicyDefaultsService } from "~/server/capacity/application/get-policy-defaults";
import { listManagedExecutives as listManagedExecutivesService } from "~/server/capacity/application/list-managed-executives";
import { listPendingRequests as listPendingRequestsService } from "~/server/capacity/application/list-pending-requests";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { UserId } from "~/server/shared/ids";

export async function getManagedExecutivesList(): Promise<
  ManagedExecutiveView[]
> {
  return runAction({
    actionName: "capacity.managed_executives.read",
    access: { kind: "permission", permission: "capacity:read:team" },
    execute: (ctx) =>
      listManagedExecutivesService(ctx, serverRuntime.capacity.read),
  });
}

export async function getExecutiveDetail(
  userId: UserId,
): Promise<ExecutiveCapacityDetailView> {
  return runAction({
    actionName: "capacity.executive_detail.read",
    access: { kind: "permission", permission: "capacity:read:team" },
    input: { userId },
    execute: (ctx) =>
      getExecutiveDetailService(ctx, serverRuntime.capacity.read, {
        userId,
      }),
  });
}

export async function getPendingRequests(): Promise<
  PendingCapacityRequestView[]
> {
  return runAction({
    actionName: "capacity.pending_requests.read",
    access: { kind: "permission", permission: "capacity:read:team" },
    execute: (ctx) =>
      listPendingRequestsService(ctx, serverRuntime.capacity.read),
  });
}

export async function getPolicyDefaults(): Promise<CapacityPolicyDefaultsView> {
  return runAction({
    actionName: "capacity.policy_defaults.read",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    execute: (ctx) =>
      getPolicyDefaultsService(ctx, serverRuntime.capacity.read),
  });
}

export async function getAuditEvents(
  limit?: number,
): Promise<CapacityAuditEvent[]> {
  const safeLimit =
    limit == null ? undefined : assertPositiveInt(limit, "limit");
  return runAction({
    actionName: "capacity.audit.read",
    access: { kind: "permission", permission: "capacity:audit:read" },
    input: { limit: safeLimit },
    execute: (ctx) =>
      getAuditEventsService(ctx, serverRuntime.capacity.read, {
        limit: safeLimit,
      }),
  });
}
