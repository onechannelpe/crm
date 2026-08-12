import type {
  CapacityPolicyDefaultsView,
  ExecutiveCapacityDetailView,
  ManagedExecutiveView,
  PendingCapacityRequestView,
} from "~/contracts/capacity";
import { UserId } from "~/domain/ids";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function getManagedExecutivesList(): Promise<
  ManagedExecutiveView[]
> {
  return executeSessionServerFunction({
    name: "capacity.managed_executives.read",
    access: { kind: "permission", permission: "capacity:read:team" },

    execute: (ctx) => application.capacity.listManagedExecutives(ctx),
  });
}

export async function getExecutiveDetail(
  userId: string,
): Promise<ExecutiveCapacityDetailView> {
  return executeSessionServerFunction({
    name: "capacity.executive_detail.read",
    access: { kind: "permission", permission: "capacity:read:team" },

    parse: () =>
      parseObject({ userId }, validationFail, (r) => {
        const parsedUserId = r.id("userId", UserId);
        return { userId: parsedUserId };
      }),

    telemetry: (params) => ({ userId: params.userId }),

    execute: (ctx, params) =>
      application.capacity.getExecutiveDetail(ctx, params),
  });
}

export async function getPendingRequests(): Promise<
  PendingCapacityRequestView[]
> {
  return executeSessionServerFunction({
    name: "capacity.pending_requests.read",
    access: { kind: "permission", permission: "capacity:read:team" },

    execute: (ctx) => application.capacity.listPendingRequests(ctx),
  });
}

export async function getPolicyDefaults(): Promise<CapacityPolicyDefaultsView> {
  return executeSessionServerFunction({
    name: "capacity.policy_defaults.read",
    access: { kind: "permission", permission: "capacity:policy:manage" },

    execute: (ctx) => application.capacity.getPolicyDefaults(ctx),
  });
}
