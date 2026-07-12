import type { BranchId, UserId } from "~/server/shared/ids";

import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "../core/session-contract";
import type { Role } from "./rbac";

export interface AuthSession {
  id: string;
  userId: UserId;
  branchId: BranchId;
  role: Role;
  onboardingCompleted: boolean;
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: Date | null;
  // The administrator's user id when this session is an active impersonation,
  // otherwise null.
  impersonatorUserId: UserId | null;
}
