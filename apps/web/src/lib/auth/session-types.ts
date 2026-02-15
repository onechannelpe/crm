import type { Role } from "./rbac";

export interface AuthSession {
  id: string;
  userId: number;
  branchId: number;
  role: Role;
}
