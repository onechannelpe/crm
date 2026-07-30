import type {
  CapacityPolicyDefaultsView,
  ExecutiveCapacityDetailView,
  ManagedExecutiveView,
  PendingCapacityRequestView,
} from "~/contracts/capacity";
import { UserId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getCapacityRuntime } from "~/server/platform/container/capacity-runtime";

export async function getManagedExecutivesList(): Promise<
  ManagedExecutiveView[]
> {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.managed_executives.read",
    access: { kind: "permission", permission: "capacity:read:team" },

    execute: (ctx) => getCapacityRuntime().useCases.listManagedExecutives(ctx),
  });
}

export async function getExecutiveDetail(
  userId: string,
): Promise<ExecutiveCapacityDetailView> {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.executive_detail.read",
    access: { kind: "permission", permission: "capacity:read:team" },

    parse: () =>
      parseObject({ userId }, validationFail, (r) => {
        const parsedUserId = r.id("userId", UserId);
        return { userId: parsedUserId };
      }),

    audit: (params) => ({ userId: params.userId }),

    execute: (ctx, params) =>
      getCapacityRuntime().useCases.getExecutiveDetail(ctx, params),
  });
}

export async function getPendingRequests(): Promise<
  PendingCapacityRequestView[]
> {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.pending_requests.read",
    access: { kind: "permission", permission: "capacity:read:team" },

    execute: (ctx) => getCapacityRuntime().useCases.listPendingRequests(ctx),
  });
}

export async function getPolicyDefaults(): Promise<CapacityPolicyDefaultsView> {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.policy_defaults.read",
    access: { kind: "permission", permission: "capacity:policy:manage" },

    execute: (ctx) => getCapacityRuntime().useCases.getPolicyDefaults(ctx),
  });
}
