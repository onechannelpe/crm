/**
 * WebAuthn utilities for base64 conversion and credential formatting
 */

export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(Array.from(atob(base64), (c) => c.charCodeAt(0)));
}

export function uint8ArrayToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export function formatRegistrationOptions(options: any) {
  return {
    ...options,
    challenge: base64ToUint8Array(options.challenge),
    user: {
      ...options.user,
      id: base64ToUint8Array(options.user.id),
    },
    excludeCredentials: options.excludeCredentials?.map((cred: any) => ({
      ...cred,
      id: base64ToUint8Array(cred.id),
    })),
  };
}

export function formatAuthenticationOptions(options: any) {
  return {
    ...options,
    challenge: base64ToUint8Array(options.challenge),
    allowCredentials: options.allowCredentials?.map((cred: any) => ({
      ...cred,
      id: base64ToUint8Array(cred.id),
    })),
  };
}

export function serializeRegistrationCredential(
  credential: PublicKeyCredential,
) {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: uint8ArrayToBase64(credential.rawId),
    response: {
      attestationObject: uint8ArrayToBase64(response.attestationObject),
      clientDataJSON: uint8ArrayToBase64(credential.response.clientDataJSON),
      transports: response.getTransports?.() || [],
    },
    type: credential.type,
  };
}

export function serializeAuthenticationCredential(
  credential: PublicKeyCredential,
) {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: uint8ArrayToBase64(credential.rawId),
    response: {
      authenticatorData: uint8ArrayToBase64(response.authenticatorData),
      clientDataJSON: uint8ArrayToBase64(credential.response.clientDataJSON),
      signature: uint8ArrayToBase64(response.signature),
      userHandle: response.userHandle
        ? uint8ArrayToBase64(response.userHandle)
        : null,
    },
    type: credential.type,
  };
}
