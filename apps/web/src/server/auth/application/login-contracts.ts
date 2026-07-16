import type { Role } from "~/lib/auth/access/rbac";
import type { SessionClass } from "~/lib/auth/core/session-contract";
import type { PasskeyLoginFlowState } from "~/lib/auth/passkey/types";

export interface TotpLoginFlowState {
  id: string;
  identifier: string;
  state: "totp";
}

export type LoginFlowState = TotpLoginFlowState | PasskeyLoginFlowState;

export interface LoginFlowLoginResult {
  userId: string;
  role: Role;
  sessionClass: SessionClass;
  token: string;
}

export type SubmitPrimaryLoginResult =
  | { kind: "totp_required"; flow: TotpLoginFlowState }
  | { kind: "passkey_required"; flow: PasskeyLoginFlowState }
  | { kind: "complete"; result: LoginFlowLoginResult };

export type SubmitPrimaryLoginError = {
  kind: "invalid_credentials" | "strong_auth_required";
};
