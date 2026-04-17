import type { TeamId, UserId } from "~/server/shared/ids";

import type { CapacityTeam, ManageableCapacityUser } from "./actor-scope";

export interface CapacityApprovalRequest {
  id: number;
  userId: UserId;
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
    actorUserId: UserId,
    note: string | null,
  ): Promise<boolean>;
  markRequestRejected(
    requestId: number,
    actorUserId: UserId,
    note: string,
  ): Promise<boolean>;
  findManagedUserById(
    userId: UserId,
  ): Promise<ManageableCapacityUser | undefined>;
  findSupervisedTeamBySupervisorId(
    supervisorId: UserId,
  ): Promise<{ id: TeamId } | undefined>;
  findManagedTeamById(teamId: TeamId): Promise<CapacityTeam | undefined>;
  grantSearchCapacity(input: {
    userId: UserId;
    amount: number;
    reason: string;
    actorUserId: UserId;
  }): Promise<void>;
  grantLeadCapacity(input: {
    userId: UserId;
    amount: number;
    reason: string;
    actorUserId: UserId;
  }): Promise<void>;
}

export interface CapacityApprovalPort {
  enforceApprovalRateLimit(userId: UserId): Promise<void>;
  withTransaction<T>(
    operation: (tx: CapacityApprovalTxPort) => Promise<T>,
  ): Promise<T>;
}
