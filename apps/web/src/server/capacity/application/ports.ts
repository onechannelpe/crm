import type { CapacityTeam, ManageableCapacityUser } from "./actor-scope";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

export interface CapacityApprovalRequest {
  id: number;
  userId: number;
  kind: "search_extra" | "lead_refill_extra";
  status: "pending" | "approved" | "rejected" | "canceled";
  requestedAmount: number;
  reason: string;
}

export interface CapacityApprovalTxPort {
  findRequestById(
    requestId: number,
  ): Promise<CapacityApprovalRequest | undefined>;
  markRequestApproved(
    requestId: number,
    actorUserId: number,
    note: string | null,
  ): Promise<boolean>;
  markRequestRejected(
    requestId: number,
    actorUserId: number,
    note: string,
  ): Promise<boolean>;
  findManagedUserById(
    userId: number,
  ): Promise<ManageableCapacityUser | undefined>;
  findManagedTeamById(teamId: number): Promise<CapacityTeam | undefined>;
  findBranchSupervisors(
    branchId: number,
  ): Promise<Array<{ id: number; user_id: number; names: string }>>;
  grantSearchCapacity(input: {
    userId: number;
    amount: number;
    reason: string;
    actorUserId: number;
  }): Promise<void>;
  grantLeadCapacity(input: {
    userId: number;
    amount: number;
    reason: string;
    actorUserId: number;
  }): Promise<void>;
}

export interface CapacityApprovalPort {
  enforceApprovalRateLimit(userId: number): Promise<void>;
  withTransaction<T>(
    operation: (
      tx: CapacityApprovalTxPort,
    ) => Promise<Result<T, DomainError>>,
  ): Promise<Result<T, DomainError>>;
}
