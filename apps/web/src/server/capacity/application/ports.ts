import type { Role } from "~/lib/auth/access/rbac";

export interface CapacityApprovalRequest {
  id: number;
  userId: number;
  kind: "search_extra" | "lead_refill_extra";
  status: "pending" | "approved" | "rejected" | "canceled";
  requestedAmount: number;
  reason: string;
}

export interface CapacityApprovalManagedUser {
  role: Role;
  branchId: number;
  teamId: number | null;
}

export interface CapacityApprovalManagedTeam {
  id: number;
  branchId: number;
  supervisorId: number | null;
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
  ): Promise<CapacityApprovalManagedUser | undefined>;
  findSupervisedTeamBySupervisorId(
    supervisorId: number,
  ): Promise<{ id: number } | undefined>;
  findManagedTeamById(
    teamId: number,
  ): Promise<CapacityApprovalManagedTeam | undefined>;
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
    operation: (tx: CapacityApprovalTxPort) => Promise<T>,
  ): Promise<T>;
}
