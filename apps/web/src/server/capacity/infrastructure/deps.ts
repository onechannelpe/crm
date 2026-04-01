import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  repos,
  rateLimitDeps,
  runInRepositoryTransaction,
} from "~/server/shared/context";

export function createCapacityDeps() {
  return {
    repos: {
      users: repos.users,
      teams: repos.teams,
      auditLogs: repos.auditLogs,
      capacityRequests: repos.capacityRequests,
      searchPolicyDefaults: repos.searchPolicyDefaults,
      searchPolicyOverrides: repos.searchPolicyOverrides,
      leadPolicyDefaults: repos.leadPolicyDefaults,
      leadPolicyOverrides: repos.leadPolicyOverrides,
      searchCapacityGrants: repos.searchCapacityGrants,
      searchUsageReservations: repos.searchUsageReservations,
      searchUsageCommits: repos.searchUsageCommits,
      leadCapacityGrants: repos.leadCapacityGrants,
      leadUsageReservations: repos.leadUsageReservations,
      leadUsageCommits: repos.leadUsageCommits,
      leadAssignments: repos.leadAssignments,
    },
    rateLimitDeps,
    runInRepositoryTransaction,
  };
}

export type CapacityDeps = ReturnType<typeof createCapacityDeps>;

export type CapacityApprovalTxRepos = {
  capacityRequests: {
    findById(id: number): Promise<
      | {
          id: number;
          user_id: number;
          kind: "search_extra" | "lead_refill_extra";
          status: "pending" | "approved" | "rejected" | "canceled";
          requested_amount: number;
          reason: string;
        }
      | undefined
    >;
    markApproved(
      id: number,
      actorUserId: number,
      note: string | null,
    ): Promise<{ numUpdatedRows: bigint } | undefined>;
    markRejected(
      id: number,
      actorUserId: number,
      note: string,
    ): Promise<{ numUpdatedRows: bigint } | undefined>;
  };
  users: {
    findById(id: number): Promise<
      | {
          role:
            | "executive"
            | "supervisor"
            | "back_office"
            | "sales_manager"
            | "logistics"
            | "hr"
            | "admin"
            | "superuser";
          branch_id: number;
          team_id: number | null;
        }
      | undefined
    >;
  };
  teams: {
    findBySupervisorId(id: number): Promise<{ id: number } | undefined>;
    findByIdWithSupervisor(id: number): Promise<
      | {
          id: number;
          branch_id: number;
          supervisor_id: number | null;
        }
      | undefined
    >;
  };
  searchCapacityGrants: {
    insert(values: {
      user_id: number;
      amount: number;
      reason: string;
      actor_user_id: number;
    }): Promise<void>;
    findByUserAndPeriod(
      userId: number,
      periodStart?: string,
      periodEnd?: string,
    ): Promise<
      Array<{
        id: string;
        created_at: number;
        user_id: number;
        amount: number;
        reason: string;
        actor_user_id: number;
      }>
    >;
  };
  leadCapacityGrants: {
    insert(values: {
      user_id: number;
      amount: number;
      reason: string;
      actor_user_id: number;
    }): Promise<void>;
    findByUserAndDate(
      userId: number,
      date?: string,
    ): Promise<
      Array<{
        id: string;
        created_at: number;
        user_id: number;
        amount: number;
        reason: string;
        actor_user_id: number;
      }>
    >;
  };
};

export type CapacityApprovalDeps = {
  enforceApprovalRateLimit(userId: number): Promise<void>;
  runInRepositoryTransaction<T>(
    operation: (txRepos: CapacityApprovalTxRepos) => Promise<T>,
  ): Promise<T>;
};

export function createCapacityApprovalDeps(): CapacityApprovalDeps {
  return {
    async enforceApprovalRateLimit(userId: number) {
      await checkActionRateLimit("capacity.approve", userId, rateLimitDeps);
    },
    runInRepositoryTransaction<T>(
      operation: (txRepos: CapacityApprovalTxRepos) => Promise<T>,
    ) {
      return runInRepositoryTransaction((txRepos) =>
        operation({
          capacityRequests: txRepos.capacityRequests,
          users: txRepos.users,
          teams: txRepos.teams,
          searchCapacityGrants: txRepos.searchCapacityGrants,
          leadCapacityGrants: txRepos.leadCapacityGrants,
        }),
      );
    },
  };
}
