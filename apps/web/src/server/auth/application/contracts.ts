import type { Role } from "~/lib/auth/access/rbac";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
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

export interface TotpLoginFlowState {
  id: number;
  identifier: string;
  state: "totp";
}

export type LoginFlowState = TotpLoginFlowState | PasskeyLoginFlowState;

export interface LoginFlowLoginResult {
  userId: number;
  role: Parameters<typeof getDefaultAppPath>[0];
  onboardingCompleted: boolean;
  token: string;
}

export type SubmitPrimaryLoginResult =
  | { kind: "totp_required"; flow: TotpLoginFlowState }
  | { kind: "passkey_required"; flow: PasskeyLoginFlowState }
  | { kind: "complete"; result: LoginFlowLoginResult };

export type SubmitPrimaryLoginError =
  | {
      kind: "invalid_credentials" | "strong_auth_required";
    }
  | {
      kind: "unexpected";
      message: string;
    };

export type SubmitTotpLoginError =
  | { kind: "flow_expired" }
  | { kind: "invalid_totp" };
