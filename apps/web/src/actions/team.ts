"use server";

import { repos } from "~/server/shared/context";
import { requireAuth } from "~/lib/auth/session";

export async function getTeamMembers() {
    const session = await requireAuth();

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
