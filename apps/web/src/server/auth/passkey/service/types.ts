import type { InvalidCredentialsError } from "~/lib/auth/errors";
import type {
  PasskeyEnrollmentChallenge,
  PasskeyLoginFlowState,
  PasskeyLoginMode,
} from "~/lib/auth/passkey/types";
import type { IssuedSessionResult } from "~/lib/auth/session/session-transition";
export type {
  PasskeyEnrollmentChallenge,
  PasskeyLoginFlowState,
  PasskeyLoginMode,
};

export type PasskeyLoginResult = IssuedSessionResult;

export type BeginPasskeyLoginError =
  | InvalidCredentialsError
  | { kind: "unexpected"; message: string };

export type FinishPasskeyLoginError =
  | { kind: "flow_expired" }
  | InvalidCredentialsError
  | { kind: "unexpected"; message: string };
