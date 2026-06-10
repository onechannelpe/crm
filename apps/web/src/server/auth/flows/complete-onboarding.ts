import type { Role } from "~/lib/auth/access/rbac";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import type { Phone } from "~/lib/phone/pe-mobile";
import { createSessionService } from "~/server/auth/session/session.service";
import { type DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";
import { completeAccountOnboardingWithRepos } from "~/server/users/service-account-onboarding";

import type { AuthOnboardingContext } from "../infrastructure/onboarding-context";

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
    phone: Phone;
    ipAddress: string;
    userAgent: string | null;
  },
): Promise<Result<{ redirectTo: string; sessionToken: string }, DomainError>> {
  const result = await deps.uow.run(async (transactionRepos) => {
    const onboarding = await completeAccountOnboardingWithRepos(
      transactionRepos,
      {
        userId: input.session.userId,
        phone: input.phone,
      },
    );

    if (isErr(onboarding)) {
      return onboarding;
    }
    return Ok(undefined);
  });

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

  const issued = await createSessionService(deps.repos).establish({
    user,
    sessionClass: "app",
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    primaryAuthMethod: input.session.primaryAuthMethod,
    strongAuthMethod,
    strongAuthAt,
  });
  return Ok({
    redirectTo: getDefaultAppPath(user.role),
    sessionToken: issued.token,
  });
}
