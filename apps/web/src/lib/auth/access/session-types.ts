import type { Role } from "./rbac";

export interface AuthSession {
  id: string;
  userId: number;
  branchId: number;
  role: Role;
  authMethod: "password" | "password_totp" | "passkey";
  strongAuthAt: number | null;
}
