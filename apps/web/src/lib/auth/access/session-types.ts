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
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: Date | null;
  impersonatorUserId: UserId | null;
}
