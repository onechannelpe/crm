import type { RateLimitDeps } from "~/lib/security/action-rate-limit";
import type { AppUow } from "~/server/shared/application/uow";

import type { CapacityTeam, ManageableCapacityUser } from "../actor-scope";

export type CapacityRequestTx = {
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
      reviewerUserId: number,
      decisionNote: string | null,
    ): Promise<{ numUpdatedRows?: bigint } | undefined>;
    markRejected(
      id: number,
      reviewerUserId: number,
      decisionNote: string | null,
    ): Promise<{ numUpdatedRows?: bigint } | undefined>;
  };
};

export type CapacityRequestCreateTx = {
  capacityRequests: {
    create(values: {
      user_id: number;
      kind: "search_extra" | "lead_refill_extra";
      status: "pending";
      requested_amount: number;
      reason: string;
    }): Promise<unknown>;
  };
};

export type CapacityManageTx = {
  users: {
    findById(id: number): Promise<ManageableCapacityUser | undefined>;
  };
};

export type CapacityGrantTx = {
  searchCapacityGrants: {
    insert(values: {
      user_id: number;
      amount: number;
      reason: string;
      actor_user_id: number;
    }): Promise<void>;
    findByUserAndPeriod(
      userId: number,
      periodStart: string,
      periodEnd: string,
    ): Promise<
      {
        id: string;
        user_id: number;
        reason: string;
        created_at: number;
        amount: number;
        actor_user_id: number;
      }[]
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
      date: string,
    ): Promise<
      {
        id: string;
        user_id: number;
        reason: string;
        created_at: number;
        amount: number;
        actor_user_id: number;
      }[]
    >;
  };
};

export type CapacityPolicyTx = {
  teams: {
    findById(id: number): Promise<CapacityTeam | undefined>;
  };
  branchSupervisors: {
    isSupervisor(branchId: number, userId: number): Promise<boolean>;
  };
  searchPolicyDefaults: {
    upsert(values: {
      scope_type: "branch" | "team";
      scope_id: number;
      period_type: "month";
      search_limit: number;
    }): Promise<unknown>;
  };
  leadPolicyDefaults: {
    upsert(values: {
      scope_type: "branch" | "team";
      scope_id: number;
      active_buffer_target: number;
      daily_refill_limit: number;
    }): Promise<unknown>;
  };
  searchPolicyOverrides: {
    replaceForUser(values: {
      user_id: number;
      search_limit: number;
      effective_from: number;
      expires_at: number | null;
      set_by_user_id: number;
    }): Promise<unknown>;
  };
  leadPolicyOverrides: {
    replaceForUser(values: {
      user_id: number;
      active_buffer_target: number;
      daily_refill_limit: number;
      effective_from: number;
      expires_at: number | null;
      set_by_user_id: number;
    }): Promise<unknown>;
  };
};

export type CapacityApprovalDeps = {
  rateLimitDeps: RateLimitDeps;
  uow: AppUow<CapacityRequestTx & CapacityManageTx & CapacityGrantTx>;
};

export type CapacityGrantDeps = {
  uow: AppUow<CapacityManageTx & CapacityGrantTx>;
};

export type CapacityPolicyDeps = {
  uow: AppUow<CapacityManageTx & CapacityPolicyTx>;
};

export type CapacityRequestDeps = {
  rateLimitDeps: RateLimitDeps;
  uow: AppUow<CapacityRequestCreateTx>;
};
