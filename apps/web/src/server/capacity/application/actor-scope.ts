import type { Role } from "~/domain/auth/access/rbac";
import type { ExecutiveCategory } from "~/domain/identity/executive-category";
import type { BranchId, TeamId, UserId } from "~/domain/ids";

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
  executiveCategory: ExecutiveCategory | null;
};

export type CapacityTeam = {
  id: TeamId;
  name: string;
  branchId: BranchId;
};
