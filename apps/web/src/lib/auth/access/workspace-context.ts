import type { BranchId, TeamId, UserId } from "~/server/shared/ids";

import type { Role } from "./rbac";
import {
  getWorkspaceScopeForRole,
  requiresStrictTeamHierarchy,
  type WorkspaceScopeType,
} from "./workspace-scope";

interface TeamRecord {
  id: TeamId;
  name: string;
  branch_id: BranchId;
  supervisor_id: UserId | null;
  supervisor_names: string | null;
  supervisor_first_surname: string | null;
  supervisor_role: Role | null;
  supervisor_branch_id: BranchId | null;
}

interface ManagedTeamRecord {
  id: TeamId;
  name: string;
  branch_id: BranchId;
}

export interface WorkspaceIdentity {
  scopeType: WorkspaceScopeType;
  team: { id: TeamId; name: string } | null;
  supervisor: { id: UserId; names: string } | null;
  branch: { id: BranchId; name: string } | null;
}

interface ResolveWorkspaceContextInput {
  role: Role;
  userId: UserId;
  branchId: BranchId;
  branchName: string | null;
  userTeamId: TeamId | null;
  assignedTeam: TeamRecord | null;
  managedTeam: ManagedTeamRecord | null;
}

function createTeam(team: { id: TeamId; name: string } | null) {
  if (!team) return null;
  return { id: team.id, name: team.name };
}

export function resolveWorkspaceContext(
  input: ResolveWorkspaceContextInput,
): WorkspaceIdentity {
  const scopeType = getWorkspaceScopeForRole(input.role);
  const branch = input.branchName
    ? { id: input.branchId, name: input.branchName }
    : null;

  if (requiresStrictTeamHierarchy(input.role)) {
    if (!input.userTeamId || !input.assignedTeam) {
      throw new Error("User hierarchy misconfigured: executive has no team");
    }
    if (input.assignedTeam.branch_id !== input.branchId) {
      throw new Error("User hierarchy misconfigured: team branch mismatch");
    }
    if (
      !input.assignedTeam.supervisor_id ||
      input.assignedTeam.supervisor_role !== "supervisor" ||
      input.assignedTeam.supervisor_branch_id !== input.branchId ||
      !input.assignedTeam.supervisor_names
    ) {
      throw new Error(
        "User hierarchy misconfigured: team supervisor is invalid",
      );
    }

    return {
      scopeType,
      team: createTeam(input.assignedTeam),
      supervisor: {
        id: input.assignedTeam.supervisor_id,
        names: input.assignedTeam.supervisor_names,
      },
      branch,
    };
  }

  if (input.role === "supervisor") {
    return {
      scopeType,
      team: createTeam(input.managedTeam),
      supervisor: null,
      branch,
    };
  }

  return {
    scopeType,
    team: null,
    supervisor: null,
    branch,
  };
}
