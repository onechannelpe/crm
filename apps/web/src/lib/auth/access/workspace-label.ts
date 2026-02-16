import type { Role } from "./rbac";
import type { WorkspaceIdentity } from "./workspace-context";

interface LabelUser extends WorkspaceIdentity {
  role: Role;
  fullName: string;
}

function firstName(fullName: string): string {
  const [name] = fullName.trim().split(/\s+/);
  return name || "usuario";
}

export function getWorkspaceLabel(user: LabelUser): string {
  if (user.role === "executive") {
    if (!user.supervisor) return "equipo sin supervisor";
    return `equipo de ${firstName(user.supervisor.fullName)}`;
  }

  if (user.role === "supervisor") {
    if (!user.team) return "mi equipo";
    return `equipo ${user.team.name}`;
  }

  if (user.scopeType === "global") {
    return "plataforma global";
  }

  if (user.branch) {
    return `sucursal ${user.branch.name}`;
  }

  return `espacio de ${firstName(user.fullName)}`;
}
