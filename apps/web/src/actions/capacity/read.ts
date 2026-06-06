"use server";

import type {
  CapacityAuditEvent,
  CapacityPolicyDefaultsView,
  ExecutiveCapacityDetailView,
  ManagedExecutiveView,
  PendingCapacityRequestView,
} from "~/actions/capacity/contracts";
import { assertPositiveInt } from "~/contracts/guards";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function getManagedExecutivesList(): Promise<
  ManagedExecutiveView[]
> {
  return runAction({
    actionName: "capacity.managed_executives.read",
    access: { kind: "permission", permission: "capacity:read:team" },
    execute: (ctx) =>
      getServerRuntime().capacity.useCases.listManagedExecutives(ctx),
  });
}

export async function getExecutiveDetail(
  userId: number,
): Promise<ExecutiveCapacityDetailView> {
  const safeUserId = assertPositiveInt(userId, "userId");
  return runAction({
    actionName: "capacity.executive_detail.read",
    access: { kind: "permission", permission: "capacity:read:team" },
    input: { userId: safeUserId },
    execute: (ctx) =>
      getServerRuntime().capacity.useCases.getExecutiveDetail(ctx, {
        userId: safeUserId,
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
      getServerRuntime().capacity.useCases.listPendingRequests(ctx),
  });
}

export async function getPolicyDefaults(): Promise<CapacityPolicyDefaultsView> {
  return runAction({
    actionName: "capacity.policy_defaults.read",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    execute: (ctx) =>
      getServerRuntime().capacity.useCases.getPolicyDefaults(ctx),
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
      getServerRuntime().capacity.useCases.getAuditEvents(ctx, {
        limit: safeLimit,
      }),
  });
}
