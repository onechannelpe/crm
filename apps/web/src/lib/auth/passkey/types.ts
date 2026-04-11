import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

export interface PasskeyEnrollmentChallenge {
  challengeId: number;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export type PasskeyLoginMode = "identified" | "discoverable";

export type PasskeyLoginFlowState =
  | {
      id: number;
      identifier: string;
      mode: "identified";
      state: "passkey";
      requestOptions: PublicKeyCredentialRequestOptionsJSON;
    }
  | {
      id: number;
      mode: "discoverable";
      state: "passkey";
      requestOptions: PublicKeyCredentialRequestOptionsJSON;
    };
