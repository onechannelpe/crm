type Role = "executive" | "supervisor" | "back_office" | "sales_manager" | "logistics" | "hr" | "admin" | "superuser";

type Permission =
    | "leads:read"
    | "leads:request"
    | "quota:read"
    | "quota:allocate"
    | "sales:create"
    | "sales:submit"
    | "sales:review"
    | "sales:approve"
    | "team:read"
    | "team:manage"
    | "inventory:read"
    | "inventory:manage"
    | "hr:read"
    | "hr:manage"
    | "admin:read"
    | "admin:manage"
    | "audit:read";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    executive: ["leads:read", "leads:request", "quota:read", "sales:create", "sales:submit"],
    supervisor: ["leads:read", "leads:request", "quota:read", "quota:allocate", "sales:create", "sales:submit", "sales:review", "sales:approve", "team:read", "team:manage", "audit:read"],
    back_office: ["sales:review", "sales:approve", "audit:read"],
    sales_manager: ["leads:read", "quota:read", "quota:allocate", "sales:review", "sales:approve", "team:read", "team:manage", "inventory:read", "audit:read", "admin:read"],
    logistics: ["inventory:read", "inventory:manage"],
    hr: ["hr:read", "hr:manage", "team:read"],
    admin: ["leads:read", "quota:read", "quota:allocate", "sales:review", "team:read", "team:manage", "inventory:read", "inventory:manage", "hr:read", "hr:manage", "admin:read", "admin:manage", "audit:read"],
    superuser: ["leads:read", "leads:request", "quota:read", "quota:allocate", "sales:create", "sales:submit", "sales:review", "sales:approve", "team:read", "team:manage", "inventory:read", "inventory:manage", "hr:read", "hr:manage", "admin:read", "admin:manage", "audit:read"],
};

export function hasPermission(role: string, permission: Permission): boolean {
    const perms = ROLE_PERMISSIONS[role as Role];
    if (!perms) return false;
    return perms.includes(permission);
}

export function getPermissions(role: string): Permission[] {
    return ROLE_PERMISSIONS[role as Role] ?? [];
}
