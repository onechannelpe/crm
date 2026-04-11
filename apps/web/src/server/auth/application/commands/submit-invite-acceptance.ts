import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import type { InviteService } from "~/server/invites/application/types";
import type { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { DomainError } from "~/server/shared/domain-error";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { createUsersRepo } from "~/server/users/repos-users";

export async function submitInviteAcceptance(
  deps: {
    inviteService: InviteService;
    repos: {
      users: ReturnType<typeof createUsersRepo>;
      sessions: ReturnType<typeof createSessionRepository>;
      auditLogs: ReturnType<typeof createAuditLogsRepo>;
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
    return Err({
      kind: "unexpected",
      code: "user_not_found",
      message: "No se pudo activar la cuenta",
    });
  }

  const issued = await issueSessionTransition({
    user,
    sessionClass: "pre_auth",
    request,
    primaryAuthMethod: "password",
    strongAuthMethod: null,
    strongAuthAt: null,
    deps: deps.repos,
  });

  return Ok({
    sessionToken: issued.token,
    redirectTo: "/onboarding",
  });
}
