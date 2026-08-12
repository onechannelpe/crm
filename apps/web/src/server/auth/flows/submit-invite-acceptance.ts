import { validateInviteAcceptance } from "~/domain/auth/invite/activation-input";
import type { DomainError } from "~/domain/errors";
import { createSessionIssuer } from "~/server/auth/session/session.service";
import type { InviteService } from "~/server/invites/application/types";
import type { OperationContext } from "~/server/platform/operation/context";
import type { SessionRepository } from "~/server/sessions/repos-sessions";
import type { UsersRepo } from "~/server/users/repos-users";
import { isErr, Ok, type Result } from "~/shared/result";

export async function submitInviteAcceptance(
  deps: {
    inviteService: InviteService;
    repos: {
      users: UsersRepo;
      sessions: SessionRepository;
    };
  },
  request: {
    ipAddress: string;
    userAgent: string | null;
  },
  input: unknown,
  operation: OperationContext,
): Promise<Result<{ sessionToken: string; redirectTo: string }, DomainError>> {
  const validation = validateInviteAcceptance(input);

  if (isErr(validation)) {
    return validation;
  }

  const acceptance = await deps.inviteService.acceptInvite(
    validation.value,
    operation,
  );

  if (isErr(acceptance)) {
    return acceptance;
  }

  const user = await deps.repos.users.findById(acceptance.value.userId);

  if (!user) {
    throw new Error("No se pudo activar la cuenta");
  }

  const session = await createSessionIssuer({
    sessions: deps.repos.sessions,
  }).establish(
    {
      user,
      sessionClass: "pre_auth",
      request,
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
    },
    operation,
  );

  if (isErr(session)) {
    return session;
  }

  return Ok({
    sessionToken: session.value.token,
    redirectTo: "/onboarding",
  });
}
