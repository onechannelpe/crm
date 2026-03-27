import type { AppContext } from "~/server/shared/action-runtime";
import { repos } from "~/server/shared/context";
import { getCapacityAuditEvents, getCapacityPolicyDefaults, getExecutiveCapacityDetail, getManagedExecutives, getPendingCapacityRequests } from "~/server/capacity-admin/read-capacity";

export function listManagedExecutives(ctx: AppContext) {
  return getManagedExecutives(ctx.actor, repos);
}

export function getExecutiveDetail(ctx: AppContext, input: { userId: number }) {
  return getExecutiveCapacityDetail(ctx.actor, input.userId, repos);
}

export function listPendingRequests(ctx: AppContext) {
  return getPendingCapacityRequests(ctx.actor, repos);
}

export function getPolicyDefaults(ctx: AppContext) {
  return getCapacityPolicyDefaults(ctx.actor, repos);
}

export function getAuditEvents(ctx: AppContext, input: { limit?: number }) {
  return getCapacityAuditEvents(ctx.actor, repos, input.limit);
}
