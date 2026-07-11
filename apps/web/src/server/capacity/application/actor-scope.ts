import type { Role } from "~/lib/auth/access/rbac";
import type { ExecutiveCategoryValue } from "~/lib/db/types";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";

export type ActorScope = {
  teamId: TeamId | null;
  branchId: BranchId;
};

export type ManageableCapacityUser = ActorScope & {
  role: Role;
};

export type CapacityUser = ManageableCapacityUser & {
  id: UserId;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  executiveCategory: ExecutiveCategoryValue | null;
};

export type CapacityTeam = {
  id: TeamId;
  name: string;
  branchId: BranchId;
};
