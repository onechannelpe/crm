import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import { repos } from "~/server/shared/context";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";

import { provisioning } from "./provisioning";
import type { AcceptTeamInviteCommand } from "./types";

export async function acceptTeamInvite(
  ctx: {
    ipAddress: string;
    userAgent: string | null;
  },
  input: AcceptTeamInviteCommand & { passwordHash: string },
): Promise<Result<{ sessionToken: string; redirectTo: string }, DomainError>> {
  const result = await provisioning.acceptInvite({
    token: input.token,
    passwordHash: input.passwordHash,
  });
  if (isErr(result)) {
    return result;
  }

  const issued = await issueSessionTransition({
    user: {
      id: result.value.userId,
      branch_id: result.value.branchId,
      role: result.value.role,
      onboarding_completed_at: null,
    },
    sessionClass: "pre_auth",
    request: {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    primaryAuthMethod: "password",
    strongAuthMethod: null,
    strongAuthAt: null,
    deps: repos,
  });

  return Ok({
    sessionToken: issued.token,
    redirectTo: "/onboarding",
  });
}
