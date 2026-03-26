import type { Role } from "~/lib/auth/access/rbac";
import type { PasskeyLoginFlowState } from "~/lib/auth/passkey/service";
import type { UserId } from "~/server/shared/ids";

export interface TotpLoginFlowState {
  id: number;
  identifier: string;
  state: "totp";
}

export type LoginFlowState = TotpLoginFlowState | PasskeyLoginFlowState;

export interface LoginFlowLoginResult {
  userId: UserId;
  role: Role;
  onboardingCompleted: boolean;
  token: string;
}

export type SubmitPrimaryLoginResult =
  | { kind: "totp_required"; flow: TotpLoginFlowState }
  | { kind: "passkey_required"; flow: PasskeyLoginFlowState }
  | { kind: "complete"; result: LoginFlowLoginResult };
