import type { Role } from "~/lib/auth/access/rbac";

export type ActorScope = {
  teamId: number | null;
  branchId: number;
};

export type CapacityUser = ActorScope & {
  id: number;
  role: Role;
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
