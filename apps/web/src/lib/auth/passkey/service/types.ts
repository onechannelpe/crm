import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

import type { InvalidCredentialsError } from "~/lib/auth/errors";
import type { LoginCompletionResult } from "~/lib/auth/session/login-completion";

export interface PasskeyEnrollmentChallenge {
  challengeId: number;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface PasskeyLoginFlowState {
  id: number;
  identifier: string;
  state: "passkey";
  requestOptions: PublicKeyCredentialRequestOptionsJSON;
}

export type PasskeyLoginResult = LoginCompletionResult;

export type PasskeyEnrollmentError =
  | { reason: "invalid_request"; message: string }
  | { reason: "unexpected"; message: string };

export type BeginPasskeyLoginError =
  | InvalidCredentialsError
  | { kind: "unexpected"; message: string };

export type FinishPasskeyLoginError =
  | { kind: "flow_expired" }
  | InvalidCredentialsError
  | { kind: "unexpected"; message: string };
