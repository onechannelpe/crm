import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

import { isPlainRecord } from "~/shared/type-guards";

function isCredential(value: unknown): value is {
  id: string;
  rawId: string;
  type: "public-key";
  response: Record<string, unknown>;
} {
  return (
    isPlainRecord(value) &&
    typeof value.id === "string" &&
    typeof value.rawId === "string" &&
    value.type === "public-key" &&
    isPlainRecord(value.response)
  );
}

export function isAuthenticationResponse(
  value: unknown,
): value is AuthenticationResponseJSON {
  return (
    isCredential(value) &&
    typeof value.response.authenticatorData === "string" &&
    typeof value.response.clientDataJSON === "string" &&
    typeof value.response.signature === "string" &&
    (value.response.userHandle == null ||
      typeof value.response.userHandle === "string")
  );
}

export function isRegistrationResponse(
  value: unknown,
): value is RegistrationResponseJSON {
  return (
    isCredential(value) &&
    typeof value.response.attestationObject === "string" &&
    typeof value.response.clientDataJSON === "string"
  );
}
