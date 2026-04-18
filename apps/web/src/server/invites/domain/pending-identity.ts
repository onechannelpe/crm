import type { Role } from "~/lib/auth/access/rbac";
import { generateInviteToken } from "~/lib/auth/invite/tokens";
import type { ExecutiveCategoryValue } from "~/lib/db/types";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";

// Pending invite users do not authenticate until acceptance flips is_active to 1
// and sets a real password hash. This placeholder avoids expensive hashing on create.
export const PENDING_INVITE_PASSWORD_PLACEHOLDER = `pending:${generateInviteToken()}`;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildPendingIdentity(input: {
  userId: UserId;
  branchId: BranchId;
  teamId: TeamId | null;
  username: string;
  email: string;
  role: Role;
  names: string;
  firstSurname: string;
  secondSurname: string;
  executiveCategory?: ExecutiveCategoryValue | null;
}) {
  return {
    id: input.userId,
    branch_id: input.branchId,
    team_id: input.teamId,
    username: input.username,
    email: input.email,
    password_hash: PENDING_INVITE_PASSWORD_PLACEHOLDER,
    names: input.names,
    first_surname: input.firstSurname,
    second_surname: input.secondSurname,
    expires_at: null,
    phone_e164: null,
    role: input.role,
    executive_category: input.executiveCategory ?? null,
    is_active: 0 as const,
  };
}
