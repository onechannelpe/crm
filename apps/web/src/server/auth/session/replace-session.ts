import type { AuthSession } from "~/domain/auth/access/session-types";
import type { OperationContext } from "~/server/platform/operation/context";
import { isErr } from "~/shared/result";

import type {
  SessionAuthenticatorDeps,
  SessionIssuerDeps,
  SessionSpec,
  SessionUser,
} from "./session-spec";
import {
  createSessionAuthenticator,
  createSessionIssuer,
} from "./session.service";

type ReplacementSessionRepos = SessionAuthenticatorDeps & SessionIssuerDeps;

export async function replaceSession(
  repos: ReplacementSessionRepos,
  input: {
    current: AuthSession;
    user: SessionUser;
    sessionClass: SessionSpec["sessionClass"];
    strongAuthMethod: SessionSpec["strongAuthMethod"];
    strongAuthAt: Date | null;
    ipAddress: string;
    userAgent: string | null;
  },
  operation: OperationContext,
): Promise<string> {
  const issued = await createSessionIssuer(repos).establish(
    {
      user: input.user,
      sessionClass: input.sessionClass,
      request: {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
      primaryAuthMethod: input.current.primaryAuthMethod,
      strongAuthMethod: input.strongAuthMethod,
      strongAuthAt: input.strongAuthAt,
    },
    operation,
  );
  // No auditAction is set above, so establish() cannot fail here.
  if (isErr(issued)) {
    throw new Error(issued.error.code ?? "session_establish_failed");
  }

  await createSessionAuthenticator(repos).revoke(input.current.id);
  return issued.value.token;
}
