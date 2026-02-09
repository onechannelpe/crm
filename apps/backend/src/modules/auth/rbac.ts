import type { Context } from "hono";

type Role =
  | "executive"
  | "supervisor"
  | "back_office"
  | "sales_manager"
  | "admin";

const ROLE_HIERARCHY: Record<Role, number> = {
  executive: 1,
  supervisor: 2,
  back_office: 2,
  sales_manager: 3,
  admin: 4,
};

export function requireRole(allowedRoles: Role[]) {
  return async (c: Context, next: Function) => {
    const userRole = c.get("userRole") as Role;
    const userLevel = ROLE_HIERARCHY[userRole];
    const minRequired = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r]));

    if (userLevel < minRequired) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await next();
  };
}
