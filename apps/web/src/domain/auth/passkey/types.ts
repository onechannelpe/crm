import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

export interface PasskeyEnrollmentChallenge {
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export type PasskeyLoginMode = "identified" | "discoverable";

export type PasskeyLoginFlowState =
  | {
      id: string;
      identifier: string;
      mode: "identified";
      state: "passkey";
      requestOptions: PublicKeyCredentialRequestOptionsJSON;
    }
  | {
      id: string;
      mode: "discoverable";
      state: "passkey";
      requestOptions: PublicKeyCredentialRequestOptionsJSON;
    };
