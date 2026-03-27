import type { Role } from "~/lib/auth/access/rbac";
import type { WorkspaceScopeType } from "~/lib/auth/access/workspace-scope";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";
import type { PasskeyLoginFlowState } from "~/lib/auth/passkey/service";

export interface CurrentUserView {
  id: number;
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
  branchId: number;
  scopeType: WorkspaceScopeType;
  team: unknown;
  supervisor: unknown;
  branch: unknown;
}

export type PasswordLoginResult =
  | {
      ok: false;
      code: "invalid_credentials" | "strong_auth_required";
    }
  | {
      ok: true;
      nextStep: "passkey";
      flow: PasskeyLoginFlowState;
    };

export type PasskeyStartResult =
  | { ok: false; code: "invalid_credentials" }
  | { ok: true; flow: PasskeyLoginFlowState };

export type TotpLoginResult = { ok: false; code: "invalid_totp" };
