import type { AppContext } from "~/server/shared/action-runtime";

import {
  approveCapacityRequest,
  grantLeadCapacityDirect,
  grantSearchCapacityDirect,
  rejectCapacityRequest,
  requestCapacity,
  updateLeadPolicyDefault,
  updateLeadPolicyOverride,
  updateSearchPolicyDefault,
  updateSearchPolicyOverride,
} from "./commands";
import { getAuditEvents } from "./get-audit-events";
import { getExecutiveDetail } from "./get-executive-detail";
import { getPolicyDefaults } from "./get-policy-defaults";
import { listManagedExecutives } from "./list-managed-executives";
import { listPendingRequests } from "./list-pending-requests";

type RequestCapacityDeps = Parameters<typeof requestCapacity>[1];
type ApproveCapacityRequestDeps = Parameters<typeof approveCapacityRequest>[1];
type RejectCapacityRequestDeps = Parameters<typeof rejectCapacityRequest>[1];
type GrantSearchCapacityDeps = Parameters<typeof grantSearchCapacityDirect>[1];
type GrantLeadCapacityDeps = Parameters<typeof grantLeadCapacityDirect>[1];
type UpdateSearchPolicyDefaultDeps = Parameters<
  typeof updateSearchPolicyDefault
>[1];
type UpdateLeadPolicyDefaultDeps = Parameters<typeof updateLeadPolicyDefault>[1];
type UpdateSearchPolicyOverrideDeps = Parameters<
  typeof updateSearchPolicyOverride
>[1];
type UpdateLeadPolicyOverrideDeps = Parameters<
  typeof updateLeadPolicyOverride
>[1];
type ListManagedExecutivesDeps = Parameters<typeof listManagedExecutives>[1];
type GetExecutiveDetailDeps = Parameters<typeof getExecutiveDetail>[1];
type ListPendingRequestsDeps = Parameters<typeof listPendingRequests>[1];
type GetPolicyDefaultsDeps = Parameters<typeof getPolicyDefaults>[1];
type GetAuditEventsDeps = Parameters<typeof getAuditEvents>[1];

export type CapacityUseCaseDeps = {
  requestCapacity: RequestCapacityDeps;
  approveCapacityRequest: ApproveCapacityRequestDeps;
  rejectCapacityRequest: RejectCapacityRequestDeps;
  grantSearchCapacityDirect: GrantSearchCapacityDeps;
  grantLeadCapacityDirect: GrantLeadCapacityDeps;
  updateSearchPolicyDefault: UpdateSearchPolicyDefaultDeps;
  updateLeadPolicyDefault: UpdateLeadPolicyDefaultDeps;
  updateSearchPolicyOverride: UpdateSearchPolicyOverrideDeps;
  updateLeadPolicyOverride: UpdateLeadPolicyOverrideDeps;
  listManagedExecutives: ListManagedExecutivesDeps;
  getExecutiveDetail: GetExecutiveDetailDeps;
  listPendingRequests: ListPendingRequestsDeps;
  getPolicyDefaults: GetPolicyDefaultsDeps;
  getAuditEvents: GetAuditEventsDeps;
};

export function createCapacityUseCases(deps: CapacityUseCaseDeps) {
  return {
    requestCapacity(
      ctx: AppContext,
      input: Parameters<typeof requestCapacity>[2],
    ) {
      return requestCapacity(ctx, deps.requestCapacity, input);
    },
    approveCapacityRequest(
      ctx: AppContext,
      input: Parameters<typeof approveCapacityRequest>[2],
    ) {
      return approveCapacityRequest(ctx, deps.approveCapacityRequest, input);
    },
    rejectCapacityRequest(
      ctx: AppContext,
      input: Parameters<typeof rejectCapacityRequest>[2],
    ) {
      return rejectCapacityRequest(ctx, deps.rejectCapacityRequest, input);
    },
    grantSearchCapacityDirect(
      ctx: AppContext,
      input: Parameters<typeof grantSearchCapacityDirect>[2],
    ) {
      return grantSearchCapacityDirect(ctx, deps.grantSearchCapacityDirect, input);
    },
    grantLeadCapacityDirect(
      ctx: AppContext,
      input: Parameters<typeof grantLeadCapacityDirect>[2],
    ) {
      return grantLeadCapacityDirect(ctx, deps.grantLeadCapacityDirect, input);
    },
    updateSearchPolicyDefault(
      ctx: AppContext,
      input: Parameters<typeof updateSearchPolicyDefault>[2],
    ) {
      return updateSearchPolicyDefault(ctx, deps.updateSearchPolicyDefault, input);
    },
    updateLeadPolicyDefault(
      ctx: AppContext,
      input: Parameters<typeof updateLeadPolicyDefault>[2],
    ) {
      return updateLeadPolicyDefault(ctx, deps.updateLeadPolicyDefault, input);
    },
    updateSearchPolicyOverride(
      ctx: AppContext,
      input: Parameters<typeof updateSearchPolicyOverride>[2],
    ) {
      return updateSearchPolicyOverride(
        ctx,
        deps.updateSearchPolicyOverride,
        input,
      );
    },
    updateLeadPolicyOverride(
      ctx: AppContext,
      input: Parameters<typeof updateLeadPolicyOverride>[2],
    ) {
      return updateLeadPolicyOverride(ctx, deps.updateLeadPolicyOverride, input);
    },
    listManagedExecutives(ctx: AppContext) {
      return listManagedExecutives(ctx, deps.listManagedExecutives);
    },
    getExecutiveDetail(
      ctx: AppContext,
      input: Parameters<typeof getExecutiveDetail>[2],
    ) {
      return getExecutiveDetail(ctx, deps.getExecutiveDetail, input);
    },
    listPendingRequests(ctx: AppContext) {
      return listPendingRequests(ctx, deps.listPendingRequests);
    },
    getPolicyDefaults(ctx: AppContext) {
      return getPolicyDefaults(ctx, deps.getPolicyDefaults);
    },
    getAuditEvents(
      ctx: AppContext,
      input: Parameters<typeof getAuditEvents>[2],
    ) {
      return getAuditEvents(ctx, deps.getAuditEvents, input);
    },
  };
}
