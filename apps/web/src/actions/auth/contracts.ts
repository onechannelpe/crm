import type { Role } from "~/lib/auth/access/rbac";
import type { WorkspaceScopeType } from "~/lib/auth/access/workspace-scope";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";
import type { PasskeyLoginFlowState } from "~/lib/auth/passkey/types";

export interface CurrentUserView {
  id: string;
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
  branchId: string;
  scopeType: WorkspaceScopeType;
  team: { id: string; name: string } | null;
  supervisor: { id: string; names: string } | null;
  branch: { id: string; name: string } | null;
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
  userId: string;
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
