import type { RateLimitDeps } from "~/lib/security/action-rate-limit";
import type { AppContext } from "~/server/shared/action-runtime";
import type { AppUow } from "~/server/shared/application/uow";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

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

type CapacityTx = Parameters<AppUow<unknown>["run"]>[0] extends (
  tx: infer TTx,
) => Promise<Result<unknown, DomainError>>
  ? TTx
  : never;

type CapacityReadRepos = {
  users: {
    findById(id: number): Promise<{
      id: number;
      names: string;
      firstSurname: string;
      secondSurname: string;
      email: string;
      role: "superuser" | "admin" | "supervisor" | "executive";
      isActive: boolean;
      teamId: number | null;
      branchId: number;
      executiveCategory: "hunter" | "farmer" | null;
    } | undefined>;
    findByBranch(branchId: number): Promise<
      Array<{
        id: number;
        names: string;
        firstSurname: string;
        secondSurname: string;
        email: string;
        role: "superuser" | "admin" | "supervisor" | "executive";
        isActive: boolean;
        teamId: number | null;
        branchId: number;
        executiveCategory: "hunter" | "farmer" | null;
      }>
    >;
    findAllActive(): Promise<
      Array<{
        id: number;
        names: string;
        firstSurname: string;
        secondSurname: string;
        email: string;
        role: "superuser" | "admin" | "supervisor" | "executive";
        isActive: boolean;
        teamId: number | null;
        branchId: number;
        executiveCategory: "hunter" | "farmer" | null;
      }>
    >;
    findByBranchIncludingInactive(
      branchId: number,
    ): Promise<Array<{ id: number }>>;
  };
  teams: {
    findById(id: number): Promise<{ id: number; branchId: number } | undefined>;
    findByBranch(branchId: number): Promise<Array<{ id: number; name: string }>>;
  };
  branchSupervisors: {
    isSupervisor(branchId: number, userId: number): Promise<boolean>;
  };
  auditLogs: {
    listRecent(input: {
      fromInclusive: number;
      toInclusive: number;
      limit: number;
    }): Promise<
      Array<{
        id: number;
        created_at: number;
        user_id: number;
        action: string;
        entity_type: string;
        entity_id: number | null;
        changes: unknown;
      }>
    >;
  };
  capacityRequests: {
    listPendingByBranch(branchId: number): Promise<
      Array<{
        id: number;
        user_id: number;
        kind: "search_extra" | "lead_refill_extra";
        status: "pending" | "approved" | "rejected" | "canceled";
        requested_amount: number;
        reason: string;
        decision_note: string | null;
        reviewer_user_id: number | null;
        created_at: number;
        updated_at: number;
        decided_at: number | null;
        names: string;
        first_surname: string;
        second_surname: string;
        team_id: number | null;
        branch_id: number;
      }>
    >;
    listByUser(userId: number): Promise<
      Array<{
        id: number;
        user_id: number;
        kind: "search_extra" | "lead_refill_extra";
        status: "pending" | "approved" | "rejected" | "canceled";
        requested_amount: number;
        reason: string;
        decision_note: string | null;
        reviewer_user_id: number | null;
        created_at: number;
        updated_at: number;
        decided_at: number | null;
      }>
    >;
  };
  searchPolicyDefaults: {
    findForScope(
      scopeType: "branch" | "team",
      scopeId: number,
    ): Promise<{ search_limit: number } | undefined>;
    listForScope(
      scopeType: "branch" | "team",
      scopeIds: number[],
    ): Promise<Array<{ scope_id: number; search_limit: number }>>;
  };
  searchPolicyOverrides: {
    findActiveForUser(userId: number, now: number): Promise<
      | {
          user_id: number;
          search_limit: number;
          effective_from: number;
          expires_at: number | null;
          set_by_user_id: number;
          created_at: number;
          updated_at: number;
        }
      | undefined
    >;
  };
  searchCapacityGrants: {
    findByUserAndPeriod(
      userId: number,
      periodStart: string,
      periodEnd: string,
    ): Promise<
      Array<{
        id: string;
        user_id: number;
        reason: string;
        created_at: number;
        amount: number;
        actor_user_id: number;
      }>
    >;
  };
  searchUsageReservations: {
    countByUserAndPeriod(
      userId: number,
      periodStart: string,
      periodEnd: string,
    ): Promise<number>;
  };
  searchUsageCommits: {
    countByUserAndPeriod(
      userId: number,
      periodStart: string,
      periodEnd: string,
    ): Promise<number>;
  };
  leadPolicyDefaults: {
    findForScope(
      scopeType: "branch" | "team",
      scopeId: number,
    ): Promise<
      | {
          active_buffer_target: number;
          daily_refill_limit: number;
        }
      | undefined
    >;
    listForScope(
      scopeType: "branch" | "team",
      scopeIds: number[],
    ): Promise<
      Array<{
        scope_id: number;
        active_buffer_target: number;
        daily_refill_limit: number;
      }>
    >;
  };
  leadPolicyOverrides: {
    findActiveForUser(userId: number, now: number): Promise<
      | {
          user_id: number;
          active_buffer_target: number;
          daily_refill_limit: number;
          effective_from: number;
          expires_at: number | null;
          set_by_user_id: number;
          created_at: number;
          updated_at: number;
        }
      | undefined
    >;
  };
  leadCapacityGrants: {
    findByUserAndDate(
      userId: number,
      date: string,
    ): Promise<
      Array<{
        id: string;
        user_id: number;
        reason: string;
        created_at: number;
        amount: number;
        actor_user_id: number;
      }>
    >;
  };
  leadUsageReservations: {
    countByUserAndDate(userId: number, date: string): Promise<number>;
  };
  leadUsageCommits: {
    countByUserAndDate(userId: number, date: string): Promise<number>;
  };
  contactAssignments: {
    countActiveByUser(userId: number): Promise<number>;
  };
};

export type CapacityUseCaseDeps = {
  rateLimitDeps: RateLimitDeps;
  uow: AppUow<CapacityTx>;
  readRepos: CapacityReadRepos;
};

export function createCapacityUseCases(deps: CapacityUseCaseDeps) {
  return {
    requestCapacity: (
      ctx: AppContext,
      input: { kind: "search_extra" | "lead_refill"; amount: number; reason: string },
    ) => requestCapacity(ctx, deps, input),
    approveCapacityRequest: (
      ctx: AppContext,
      input: { requestId: number; note: string | null },
    ) => approveCapacityRequest(ctx, deps, input),
    rejectCapacityRequest: (
      ctx: AppContext,
      input: { requestId: number; note: string },
    ) => rejectCapacityRequest(ctx, deps, input),
    grantSearchCapacityDirect: (
      ctx: AppContext,
      input: { targetUserId: number; amount: number; reason: string },
    ) => grantSearchCapacityDirect(ctx, deps, input),
    grantLeadCapacityDirect: (
      ctx: AppContext,
      input: { targetUserId: number; amount: number; reason: string },
    ) => grantLeadCapacityDirect(ctx, deps, input),
    updateSearchPolicyDefault: (
      ctx: AppContext,
      input: { scope: { kind: "branch" | "team"; scopeId: number }; monthlyLimit: number },
    ) => updateSearchPolicyDefault(ctx, deps, input),
    updateLeadPolicyDefault: (
      ctx: AppContext,
      input: {
        scope: { kind: "branch" | "team"; scopeId: number };
        bufferTarget: number;
        dailyLimit: number;
      },
    ) => updateLeadPolicyDefault(ctx, deps, input),
    updateSearchPolicyOverride: (
      ctx: AppContext,
      input: { userId: number; monthlyLimit: number; expiresAt: number | null },
    ) => updateSearchPolicyOverride(ctx, deps, input),
    updateLeadPolicyOverride: (
      ctx: AppContext,
      input: {
        userId: number;
        bufferTarget: number;
        dailyLimit: number;
        expiresAt: number | null;
      },
    ) => updateLeadPolicyOverride(ctx, deps, input),
    listManagedExecutives: (ctx: AppContext) =>
      listManagedExecutives(ctx, { repos: deps.readRepos }),
    getExecutiveDetail: (ctx: AppContext, input: { userId: number }) =>
      getExecutiveDetail(ctx, { repos: deps.readRepos }, input),
    listPendingRequests: (ctx: AppContext) =>
      listPendingRequests(ctx, { repos: deps.readRepos }),
    getPolicyDefaults: (ctx: AppContext) =>
      getPolicyDefaults(ctx, { repos: deps.readRepos }),
    getAuditEvents: (ctx: AppContext, input: { limit?: number }) =>
      getAuditEvents(ctx, { repos: deps.readRepos }, input),
  };
}
