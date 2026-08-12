import {
  createPasskeyProvider,
  resolveWebauthnRelyingParty,
  type PasskeyProviderDeps,
  type WebauthnProvider,
} from "~/server/auth/factors/passkey-provider";

// Derive rpID from the request origin so challenge and verification agree
// behind a proxy.
export function createPasskeyProviderForOrigin(
  repos: PasskeyProviderDeps,
  publicOrigin: string,
): WebauthnProvider {
  return createPasskeyProvider(
    repos,
    resolveWebauthnRelyingParty(publicOrigin),
  );
}
