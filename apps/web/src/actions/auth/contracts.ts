import type { Role } from "~/lib/auth/access/rbac";
import type { WorkspaceScopeType } from "~/lib/auth/access/workspace-scope";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";
import type { PasskeyLoginFlowState } from "~/lib/auth/passkey/types";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";

export interface CurrentUserView {
  id: UserId;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  phoneE164: string | null;
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
  branchId: BranchId;
  scopeType: WorkspaceScopeType;
  team: { id: TeamId; name: string } | null;
  supervisor: { id: UserId; names: string } | null;
  branch: { id: BranchId; name: string } | null;
}

export type PasswordLoginSubmissionResult =
  | {
      ok: false;
      code: "invalid_credentials" | "strong_auth_required";
    }
  | {
      ok: true;
      nextStep: "passkey";
      flow: PasskeyLoginFlowState;
    };

export type PasskeyStartSubmissionResult =
  | {
      ok: false;
      code: "invalid_credentials";
    }
  | {
      ok: true;
      flow: PasskeyLoginFlowState;
    };

export type RequestPasswordResetResult =
  | { ok: true }
  | { ok: false; code: "rate_limited" | "email_required" };

export type ResetPasswordResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid_token" | "password_mismatch" | "password_too_short";
    };

export interface SessionInfo {
  id: string;
  userId: UserId;
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
