import type { Role } from "~/lib/auth/access/rbac";
import type { UserId } from "~/server/shared/ids";

export interface PrivilegedLoginAlertPayload {
  userId: UserId;
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
