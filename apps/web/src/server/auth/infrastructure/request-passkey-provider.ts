import "server-only";
import {
  createPasskeyProvider,
  resolveWebauthnRelyingParty,
  type PasskeyProviderDeps,
  type WebauthnProvider,
} from "~/server/auth/factors/passkey-provider";

// rpID is derived from the request origin so challenge and verify stay in sync
// behind a proxy. The auth application owns its repositories; adapters supply
// only this request-derived value.
export function createPasskeyProviderForOrigin(
  repos: PasskeyProviderDeps,
  publicOrigin: string,
): WebauthnProvider {
  return createPasskeyProvider(
    repos,
    resolveWebauthnRelyingParty(publicOrigin),
  );
}
