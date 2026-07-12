import { canAssignRole, hasPermission, type Role } from "./rbac";

// Authorization predicates for administering another workspace member. These
// are pure and isomorphic on purpose: the server use-cases enforce them and the
// client uses the same predicates to decide which affordances to render, so the
// two can never drift. Identity checks (acting on your own account) need the
// actor and target ids and therefore live in the use-cases, not here.

export function canManageMember(actorRole: Role, targetRole: Role): boolean {
  return canAssignRole(actorRole, targetRole);
}

export function canDeleteMember(actorRole: Role, targetRole: Role): boolean {
  return canManageMember(actorRole, targetRole) && targetRole !== "superuser";
}

export function canImpersonateMember(
  actorRole: Role,
  targetRole: Role,
): boolean {
  return hasPermission(actorRole, "admin:manage") && targetRole !== "superuser";
}
