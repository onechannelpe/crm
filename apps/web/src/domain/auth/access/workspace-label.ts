import type { Role } from "./rbac";
import type { WorkspaceIdentity } from "./workspace-context";

interface LabelUser extends WorkspaceIdentity {
  role: Role;
  names: string;
}

export function getWorkspaceLabel(user: LabelUser): string {
  if (user.role === "executive") {
    if (!user.supervisor) return "Equipo sin supervisor";
    return `Equipo de ${user.supervisor.names}`;
  }

  if (user.role === "supervisor") {
    if (!user.team) return "Mi equipo";
    return `Equipo ${user.team.name}`;
  }

  if (user.scopeType === "global") {
    return "Plataforma global";
  }

  if (user.branch) {
    return `Sucursal ${user.branch.name}`;
  }

  return `Espacio de ${user.names}`;
}
