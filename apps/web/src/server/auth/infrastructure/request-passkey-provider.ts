"use server";

import { getRequestContext } from "~/lib/http/request-context";
import {
  createPasskeyProvider,
  resolveWebauthnRelyingParty,
  type PasskeyProviderDeps,
  type WebauthnProvider,
} from "~/server/auth/factors/passkey-provider";

/**
 * Build the WebAuthn provider for the current request. The relying party is
 * derived from the origin the browser actually reached (`publicOrigin`), so
 * challenge-time and verify-time `rpID` always match, even behind a proxy.
 * Reads request-scoped state, so it must be called at the action boundary and
 * the resulting provider threaded into the flow.
 */
export function createRequestPasskeyProvider(
  repos: PasskeyProviderDeps,
): WebauthnProvider {
  return createPasskeyProvider(
    repos,
    resolveWebauthnRelyingParty(getRequestContext().publicOrigin),
  );
}
