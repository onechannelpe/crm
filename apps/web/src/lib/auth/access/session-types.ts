import type { Role } from "./rbac";

export interface AuthSession {
  id: string;
  userId: number;
  branchId: number;
  role: Role;
  onboardingCompleted: boolean;
  authMethod: "password" | "password_totp" | "passkey" | "google";
  strongAuthAt: number | null;
}
