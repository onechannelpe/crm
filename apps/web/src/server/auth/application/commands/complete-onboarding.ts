import type { Role } from "~/lib/auth/access/rbac";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import {
  issueSessionTransition,
  replaceCurrentSession,
} from "~/lib/auth/session/session-transition";
import { isErr, Ok, type Result } from "~/server/shared/result";
import {
  completeAccountOnboardingWithRepos,
  type CompleteOnboardingError,
} from "~/server/users/service-account-onboarding";

import type { AuthOnboardingContext } from "../../infrastructure/onboarding-context";

export async function completeOnboarding(
  deps: AuthOnboardingContext,
  input: {
    session: {
      userId: number;
      role: Role;
      primaryAuthMethod: "password" | "google" | "passkey";
      strongAuthMethod: "totp" | "passkey" | "federated" | null;
      strongAuthAt: number | null;
    };
    phone: string;
    ipAddress: string;
    userAgent: string | null;
    invalidateSession(sessionId: string): Promise<void>;
  },
): Promise<Result<{ redirectTo: string }, CompleteOnboardingError>> {
  const result = await deps.runInRepositoryTransaction((transactionRepos) =>
    completeAccountOnboardingWithRepos(transactionRepos, {
      userId: input.session.userId,
      phone: input.phone,
    }),
  );
  if (isErr(result)) {
    return result;
  }

  const user = await deps.repos.users.findById(input.session.userId);
  if (!user) {
    throw new Error("No se pudo completar el registro");
  }

  const strongAuthMethod = input.session.strongAuthMethod;
  const strongAuthAt =
    strongAuthMethod === null
      ? null
      : (input.session.strongAuthAt ?? Date.now());

  const issued = await issueSessionTransition({
    user,
    sessionClass: "app",
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    primaryAuthMethod: input.session.primaryAuthMethod,
    strongAuthMethod,
    strongAuthAt,
    deps: deps.repos,
  });
  await replaceCurrentSession(issued.token, (sessionId) =>
    input.invalidateSession(sessionId),
  );
  return Ok({ redirectTo: getDefaultAppPath(user.role) });
}
