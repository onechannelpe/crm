import {
  createPasskeyProvider,
  resolveWebauthnRelyingParty,
  type PasskeyProviderDeps,
  type WebauthnProvider,
} from "~/server/auth/factors/passkey-provider";
import { getRequestContext } from "~/server/platform/http/request-context";

// rpID is derived from publicOrigin so challenge and verify stay in sync behind
// a proxy. Call at the action boundary and thread the resulting provider into
// the flow.
export function createRequestPasskeyProvider(
  repos: PasskeyProviderDeps,
): WebauthnProvider {
  return createPasskeyProvider(
    repos,
    resolveWebauthnRelyingParty(getRequestContext().publicOrigin),
  );
}
