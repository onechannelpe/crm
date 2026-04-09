import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import type { PasskeyLoginFlowState } from "~/lib/auth/passkey/service";

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
