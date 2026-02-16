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
    if (!user.supervisor) return "Equipo sin supervisor";
    return `Equipo de ${firstName(user.supervisor.fullName)}`;
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

  return `Espacio de ${firstName(user.fullName)}`;
}
