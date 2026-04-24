import type { Role } from "./rbac";
import {
  getWorkspaceScopeForRole,
  requiresStrictTeamHierarchy,
  type WorkspaceScopeType,
} from "./workspace-scope";

interface TeamRecord {
  id: number;
  name: string;
  branch_id: number;
  supervisor_id: number | null;
  supervisor_names: string | null;
  supervisor_first_surname: string | null;
  supervisor_role: Role | null;
  supervisor_branch_id: number | null;
}

interface ManagedTeamRecord {
  id: number;
  name: string;
  branch_id: number;
}

export interface WorkspaceIdentity {
  scopeType: WorkspaceScopeType;
  team: { id: number; name: string } | null;
  supervisor: { id: number; names: string } | null;
  branch: { id: number; name: string } | null;
}

interface ResolveWorkspaceContextInput {
  role: Role;
  userId: number;
  branchId: number;
  branchName: string | null;
  userTeamId: number | null;
  assignedTeam: TeamRecord | null;
  managedTeam: ManagedTeamRecord | null;
}

function createTeam(team: { id: number; name: string } | null) {
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

  return {
    scopeType,
    team: null,
    supervisor: null,
    branch,
  };
}
