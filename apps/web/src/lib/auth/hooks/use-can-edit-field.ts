import type { Role } from "~/lib/auth/access/rbac";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";

export type EditableField = "executive";

const SUPERVISOR_AND_ABOVE: ReadonlySet<Role> = new Set([
  "supervisor",
  "sales_manager",
  "admin",
  "superuser",
]);

export function canEditField(role: Role, field: EditableField): boolean {
  switch (field) {
    case "executive":
      return SUPERVISOR_AND_ABOVE.has(role);
    default:
      return false;
  }
}

export function useCanEditField(field: EditableField) {
  const { currentUser } = useAuthenticatedSession();
  return () => canEditField(currentUser().role, field);
}
