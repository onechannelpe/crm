import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "../core/session-contract";
import type { Role } from "./rbac";

export interface AuthSession {
  id: string;
  userId: number;
  branchId: number;
  role: Role;
  onboardingCompleted: boolean;
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
}
