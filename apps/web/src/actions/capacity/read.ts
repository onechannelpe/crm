"use server";

import type {
  CapacityAuditEvent,
  CapacityPolicyDefaultsView,
  ExecutiveCapacityDetailView,
  ManagedExecutiveView,
  PendingCapacityRequestView,
} from "~/contracts/capacity";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";

export async function getManagedExecutivesList(): Promise<
  ManagedExecutiveView[]
> {
  return runAction({
    name: "capacity.managed_executives.read",
    access: { kind: "permission", permission: "capacity:read:team" },

    execute: (ctx) =>
      getServerRuntime().capacity.useCases.listManagedExecutives(ctx),
  });
}

export async function getExecutiveDetail(
  userId: string,
): Promise<ExecutiveCapacityDetailView> {
  return runAction({
    name: "capacity.executive_detail.read",
    access: { kind: "permission", permission: "capacity:read:team" },

    parse: () =>
      parseObject({ userId }, validationFail, (r) => {
        const parsedUserId = r.id("userId", UserId);
        return { userId: parsedUserId };
      }),

    audit: (params) => ({ userId: params.userId }),

    execute: (ctx, params) =>
      getServerRuntime().capacity.useCases.getExecutiveDetail(ctx, params),
  });
}

export async function getPendingRequests(): Promise<
  PendingCapacityRequestView[]
> {
  return runAction({
    name: "capacity.pending_requests.read",
    access: { kind: "permission", permission: "capacity:read:team" },

    execute: (ctx) =>
      getServerRuntime().capacity.useCases.listPendingRequests(ctx),
  });
}

export async function getPolicyDefaults(): Promise<CapacityPolicyDefaultsView> {
  return runAction({
    name: "capacity.policy_defaults.read",
    access: { kind: "permission", permission: "capacity:policy:manage" },

    execute: (ctx) =>
      getServerRuntime().capacity.useCases.getPolicyDefaults(ctx),
  });
}

export async function getAuditEvents(
  limit?: number,
): Promise<CapacityAuditEvent[]> {
  return runAction({
    name: "capacity.audit.read",
    access: { kind: "permission", permission: "capacity:audit:read" },

    parse: () =>
      parseObject({ limit }, validationFail, (r) => ({
        limit: limit != null ? r.posInt("limit") : undefined,
      })),

    execute: (ctx, params) =>
      getServerRuntime().capacity.useCases.getAuditEvents(ctx, params),
  });
}
