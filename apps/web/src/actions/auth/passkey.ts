"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { finishPasskeyLoginAction } from "~/lib/mutations/auth";

export async function finishPasskeyLogin(
  flowId: number,
  response: AuthenticationResponseJSON,
) {
  return finishPasskeyLoginAction({ flowId, response });
}
