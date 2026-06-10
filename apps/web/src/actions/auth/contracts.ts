import type { Role } from "~/lib/auth/access/rbac";
import type { WorkspaceScopeType } from "~/lib/auth/access/workspace-scope";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";
import type { PasskeyLoginFlowState } from "~/lib/auth/passkey/types";

export interface CurrentUserView {
  id: number;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  phone: string | null;
  avatarUrl: string | null;
  avatarVersion: number;
  onboardingCompletedAt: number | null;
  role: Role;
  strongAuthRequired: boolean;
  strongAuthConfigured: boolean;
  totpEnabled: boolean;
  hasPasskey: boolean;
  passkeyCount: number;
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  branchId: number;
  scopeType: WorkspaceScopeType;
  team: { id: number; name: string } | null;
  supervisor: { id: number; names: string } | null;
  branch: { id: number; name: string } | null;
}

export type PasswordLoginSubmissionResult = {
  nextStep: "passkey";
  flow: PasskeyLoginFlowState;
};

export type PasskeyStartSubmissionResult = {
  flow: PasskeyLoginFlowState;
};

export interface SessionInfo {
  id: string;
  userId: number;
  userEmail: string;
  userName: string;
  role: Role;
  branchName: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}
