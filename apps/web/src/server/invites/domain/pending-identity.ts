import type { Role } from "~/lib/auth/access/rbac";
import { generateInviteToken } from "~/lib/auth/invite/tokens";
import type { ExecutiveCategoryValue } from "~/lib/db/types";

// Pending invite users do not authenticate until acceptance flips is_active to 1
// and sets a real password hash. This placeholder avoids expensive hashing on create.
export const PENDING_INVITE_PASSWORD_PLACEHOLDER = `pending:${generateInviteToken()}`;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildPendingIdentity(input: {
  branchId: number;
  teamId: number | null;
  username: string;
  email: string;
  role: Role;
  names: string;
  firstSurname: string;
  secondSurname: string;
  expiresAt: number | null;
  executiveCategory?: ExecutiveCategoryValue | null;
}) {
  return {
    branch_id: input.branchId,
    team_id: input.teamId,
    username: input.username,
    email: input.email,
    password_hash: PENDING_INVITE_PASSWORD_PLACEHOLDER,
    names: input.names,
    first_surname: input.firstSurname,
    second_surname: input.secondSurname,
    expires_at: input.expiresAt,
    phone_e164: null,
    role: input.role,
    executive_category: input.executiveCategory ?? null,
    is_active: 0 as const,
  };
}
