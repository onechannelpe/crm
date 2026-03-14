import type {
  AuthenticatorAttachment,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials?.get === "function"
  );
}

export function toRequestOptions(
  options: PublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptions {
  return {
    challenge: decodeBase64Url(options.challenge),
    timeout: options.timeout,
    rpId: options.rpId,
    userVerification: options.userVerification,
    allowCredentials: options.allowCredentials?.map((credential) => ({
      type: credential.type,
      id: decodeBase64Url(credential.id),
    })),
  };
}

export function toAuthenticationPayload(
  credential: PublicKeyCredential,
): AuthenticationResponseJSON {
  if (!(credential.response instanceof AuthenticatorAssertionResponse)) {
    throw new Error("Invalid passkey assertion response");
  }

  const userHandle = credential.response.userHandle
    ? encodeBase64Url(credential.response.userHandle)
    : undefined;

  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: "public-key",
    response: {
      authenticatorData: encodeBase64Url(credential.response.authenticatorData),
      clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
      signature: encodeBase64Url(credential.response.signature),
      ...(userHandle ? { userHandle } : {}),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

export function toCreationOptions(
  options: PublicKeyCredentialCreationOptionsJSON,
): PublicKeyCredentialCreationOptions {
  return {
    challenge: decodeBase64Url(options.challenge),
    rp: options.rp,
    user: {
      ...options.user,
      id: decodeBase64Url(options.user.id),
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    attestation: options.attestation,
    authenticatorSelection: options.authenticatorSelection,
    excludeCredentials: options.excludeCredentials?.map((credential) => ({
      type: credential.type,
      id: decodeBase64Url(credential.id),
    })),
  };
}

export async function createRegistrationResponse(
  options: PublicKeyCredentialCreationOptionsJSON,
): Promise<RegistrationResponseJSON> {
  const credential = await navigator.credentials.create({
    publicKey: toCreationOptions(options),
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("No se pudo crear la clave de acceso");
  }

  return toRegistrationPayload(credential);
}

export function toRegistrationPayload(
  credential: PublicKeyCredential,
): RegistrationResponseJSON {
  if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
    throw new Error("Invalid passkey registration response");
  }

  const response: RegistrationResponseJSON["response"] = {
    clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
    attestationObject: encodeBase64Url(credential.response.attestationObject),
  };

  const authenticatorAttachment = normalizeAuthenticatorAttachment(
    credential.authenticatorAttachment,
  );

  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: "public-key",
    response,
    ...(authenticatorAttachment ? { authenticatorAttachment } : {}),
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

function normalizeAuthenticatorAttachment(
  value: string | null,
): AuthenticatorAttachment | undefined {
  if (value === "platform" || value === "cross-platform") {
    return value;
  }
  return undefined;
}

function encodeBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes.buffer;
}
