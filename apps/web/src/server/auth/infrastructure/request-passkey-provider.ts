"use server";

import { getRequestEvent } from "solid-js/web";

import {
  createPasskeyProvider,
  resolveWebauthnRelyingParty,
} from "~/lib/auth/providers/passkey-provider";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";

type PasskeyProviderDeps = {
  passkeys: ReturnType<typeof createPasskeysRepo>;
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
};

export function createRequestPasskeyProviderFactory() {
  const request = getRequestEvent()?.request;
  const relyingParty = resolveWebauthnRelyingParty(request);

  return (repos: PasskeyProviderDeps) =>
    createPasskeyProvider(repos, relyingParty);
}
