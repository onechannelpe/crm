import type { Role } from "~/lib/auth/access/rbac";

export interface PrivilegedLoginAlertPayload {
  userId: number;
  email: string;
  fullName: string;
  role: Role;
  ipAddress: string;
  method: string;
  occurredAt: number;
}

export type SendPrivilegedLoginAlert = (
  payload: PrivilegedLoginAlertPayload,
) => Promise<void>;
