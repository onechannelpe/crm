import type { Role } from "~/domain/auth/access/rbac";
import { generateInviteToken } from "~/domain/auth/invite/tokens";
import type { ExecutiveCategory } from "~/domain/identity/executive-category";
import type { BranchId, TeamId } from "~/domain/ids";

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
  executiveCategory?: ExecutiveCategory | null;
  createdAt: Date;
}) {
  return {
    created_at: input.createdAt,
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
