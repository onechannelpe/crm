import type { Role } from "~/lib/auth/access/rbac";
import { generateInviteToken } from "~/lib/auth/invite/tokens";
import type { ExecutiveCategoryValue } from "~/lib/db/types";
import type { BranchId, TeamId } from "~/server/shared/ids";

// Placeholder password hash for pending invites: avoids Argon2id cost on
// create. Acceptance replaces the hash and flips is_active to 1, gating
// authentication.
const PENDING_INVITE_PASSWORD_PLACEHOLDER = `pending:${generateInviteToken()}`;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildPendingIdentity(input: {
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
    branch_id: input.branchId,
    team_id: input.teamId,
    username: input.username,
    email: input.email,
    password_hash: PENDING_INVITE_PASSWORD_PLACEHOLDER,
    names: input.names,
    first_surname: input.firstSurname,
    second_surname: input.secondSurname,
    expires_at: null,
    role: input.role,
    executive_category: input.executiveCategory ?? null,
    is_active: false,
  };
}
