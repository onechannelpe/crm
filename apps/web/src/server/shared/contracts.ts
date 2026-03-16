import type { BranchId, TeamId, UserId } from "~/server/shared/ids";

export interface AuthenticatedActor {
  userId: UserId;
  branchId: BranchId;
  role: "executive" | "supervisor" | "admin" | "superuser" | "sales_manager";
  teamId: TeamId | null;
}

export interface PaginationInput {
  limit?: number;
  offset?: number;
}
