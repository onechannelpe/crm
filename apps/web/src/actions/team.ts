"use server";

import type { Role } from "~/lib/auth/access/rbac";

import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";

export interface TeamMember {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  teamId: number | null;
  isActive: boolean;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const session = await requirePermission("team:read");

  const users = await repos.users.findByBranch(session.branchId);

  return users.map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    teamId: u.team_id,
    isActive: !!u.is_active,
  }));
}
