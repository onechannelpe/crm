import type { DomainError } from "~/domain/errors";
import { createSessionService } from "~/server/auth/session/session.service";
import type { EventsRepo } from "~/server/event-logs/events-repo";
import type { InviteService } from "~/server/invites/application/types";
import type { SessionRepository } from "~/server/sessions/repos-sessions";
import type { UsersRepo } from "~/server/users/repos-users";
import { isErr, Ok, type Result } from "~/shared/result";

export async function submitInviteAcceptance(
  deps: {
    inviteService: InviteService;
    repos: {
      users: UsersRepo;
      sessions: SessionRepository;
      events: EventsRepo;
    };
  },
  request: {
    ipAddress: string;
    userAgent: string | null;
  },
  input: {
    token: string;
    password: string;
  },
): Promise<Result<{ sessionToken: string; redirectTo: string }, DomainError>> {
  const accepted = await deps.inviteService.acceptInvite(input);
  if (isErr(accepted)) {
    return accepted;
  }

  const user = await deps.repos.users.findById(accepted.value.userId);
  if (!user) {
    throw new Error("No se pudo activar la cuenta");
  }

  const issued = await createSessionService(deps.repos).establish({
    user,
    sessionClass: "pre_auth",
    request,
    primaryAuthMethod: "password",
    strongAuthMethod: null,
    strongAuthAt: null,
  });

  return Ok({
    sessionToken: issued.token,
    redirectTo: "/onboarding",
  });
}
