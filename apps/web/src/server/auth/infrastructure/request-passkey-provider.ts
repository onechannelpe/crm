"use server";

import { getRequestEvent } from "solid-js/web";

import {
  createPasskeyProvider,
  resolveWebauthnRelyingParty,
} from "~/server/auth/factors/passkey-provider";
import type { createEventsRepo } from "~/server/shared/repos-events";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";

type PasskeyProviderDeps = {
  passkeys: ReturnType<typeof createPasskeysRepo>;
  events: ReturnType<typeof createEventsRepo>;
};

export function createRequestPasskeyProviderFactory() {
  const request = getRequestEvent()?.request;
  const relyingParty = resolveWebauthnRelyingParty(request);

  return (repos: PasskeyProviderDeps) =>
    createPasskeyProvider(repos, relyingParty);
}
