"use server";

import { getRequestEvent } from "solid-js/web";

import {
  createPasskeyProvider,
  resolveWebauthnRelyingParty,
} from "~/lib/auth/providers/passkey-provider";
import type { Repositories } from "~/server/shared/registry";

type PasskeyProviderDeps = Pick<Repositories, "passkeys" | "auditLogs">;

export function createRequestPasskeyProviderFactory() {
  const request = getRequestEvent()?.request;
  const relyingParty = resolveWebauthnRelyingParty(request);

  return (repos: PasskeyProviderDeps) =>
    createPasskeyProvider(repos, relyingParty);
}
