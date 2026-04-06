import type { Role } from "~/lib/auth/access/rbac";

export type ActorScope = {
  teamId: number | null;
  branchId: number;
};

export type ManageableCapacityUser = ActorScope & {
  role: Role;
};

export type CapacityUser = ManageableCapacityUser & {
  id: number;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
};

export type CapacityTeam = {
  id: number;
  name: string;
  branchId: number;
  supervisorId: number | null;
};
