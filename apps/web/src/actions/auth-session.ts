"use server";

import type { Role } from "~/lib/auth/access/rbac";
import {
  resolveWorkspaceContext,
  type WorkspaceIdentity,
} from "~/lib/auth/access/workspace-context";
import { type WorkspaceScopeType } from "~/lib/auth/access/workspace-scope";
import {
  deleteSessionCookie,
  getSessionCookie,
} from "~/lib/auth/session/cookies";
import {
  invalidateSession,
  validateSessionToken,
} from "~/lib/auth/session/session-manager";
import { hashSessionToken } from "~/lib/auth/session/tokens";
import { repos } from "~/server/shared/context";

export async function logout(): Promise<void> {
  const token = getSessionCookie();
  if (!token) return;

  const sessionId = hashSessionToken(token);
  const { session } = await validateSessionToken(token);

  await invalidateSession(sessionId);
  deleteSessionCookie();

  if (session) {
    await repos.auditLogs.create({
      user_id: session.userId,
      action: "logout",
      entity_type: "user",
      entity_id: session.userId,
      changes: null,
      created_at: Date.now(),
    });
  }
}

export interface CurrentUser extends WorkspaceIdentity {
  id: number;
  email: string;
  fullName: string;
  phoneE164: string | null;
  onboardingCompletedAt: number | null;
  role: Role;
  strongAuthRequired: boolean;
  strongAuthEnrolledAt: number | null;
  branchId: number;
  scopeType: WorkspaceScopeType;
}

export async function getMe(): Promise<CurrentUser | null> {
  const token = getSessionCookie();
  if (!token) return null;

  const { session } = await validateSessionToken(token);
  if (!session) return null;

  const user = await repos.users.findById(session.userId);
  if (!user) return null;

  const [branch, assignedTeam, managedTeam] = await Promise.all([
    repos.branches.findById(user.branch_id),
    user.team_id ? repos.teams.findByIdWithSupervisor(user.team_id) : null,
    session.role === "supervisor"
      ? repos.teams.findBySupervisorId(user.id)
      : Promise.resolve(null),
  ]);
  const workspace = resolveWorkspaceContext({
    role: session.role,
    userId: user.id,
    branchId: user.branch_id,
    branchName: branch?.name ?? null,
    userTeamId: user.team_id,
    assignedTeam: assignedTeam
      ? {
          id: assignedTeam.id,
          name: assignedTeam.name,
          branch_id: assignedTeam.branch_id,
          supervisor_id: assignedTeam.supervisor_id,
          supervisor_name: assignedTeam.supervisor_name,
          supervisor_role: assignedTeam.supervisor_role,
          supervisor_branch_id: assignedTeam.supervisor_branch_id,
        }
      : null,
    managedTeam: managedTeam
      ? {
          id: managedTeam.id,
          name: managedTeam.name,
          branch_id: managedTeam.branch_id,
        }
      : null,
  });

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phoneE164: user.phone_e164,
    onboardingCompletedAt: user.onboarding_completed_at,
    role: session.role,
    strongAuthRequired: user.strong_auth_required === 1,
    strongAuthEnrolledAt: user.strong_auth_enrolled_at,
    branchId: user.branch_id,
    scopeType: workspace.scopeType,
    team: workspace.team,
    supervisor: workspace.supervisor,
    branch: workspace.branch,
  };
}
