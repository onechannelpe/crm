import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";
import type { createUserProvisioningService } from "~/server/users/service-user-provisioning";

import type { AcceptTeamInviteCommand } from "./types";

type TeamAcceptanceProvisioning = Pick<
  ReturnType<typeof createUserProvisioningService>,
  "acceptInvite"
>;

type IssuePreAuthSession = (input: {
  user: {
    id: number;
    branch_id: number;
    role: AcceptInviteResult["role"];
    onboarding_completed_at: null;
  };
  request: {
    ipAddress: string;
    userAgent: string | null;
  };
}) => Promise<{ token: string }>;

type AcceptInviteResult = {
  userId: number;
  branchId: number;
  role: Role;
};

export async function acceptTeamInvite(
  ctx: {
    ipAddress: string;
    userAgent: string | null;
  },
  input: AcceptTeamInviteCommand & { passwordHash: string },
  deps: {
    provisioning: TeamAcceptanceProvisioning;
    issuePreAuthSession: IssuePreAuthSession;
  },
): Promise<Result<{ sessionToken: string; redirectTo: string }, DomainError>> {
  const result = await deps.provisioning.acceptInvite({
    token: input.token,
    passwordHash: input.passwordHash,
  });
  if (isErr(result)) {
    return result;
  }

  const issued = await deps.issuePreAuthSession({
    user: {
      id: result.value.userId,
      branch_id: result.value.branchId,
      role: result.value.role,
      onboarding_completed_at: null,
    },
    request: {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  });

  return Ok({
    sessionToken: issued.token,
    redirectTo: "/onboarding",
  });
}
