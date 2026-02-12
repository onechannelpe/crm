import { getSessionCookie } from "./cookies";
import { validateSessionToken } from "./session-manager";

export interface SessionData {
    userId: number;
    email?: string;
    role: string;
    branchId: number;
}

export async function getSession(): Promise<SessionData | null> {
    const token = getSessionCookie();
    if (!token) return null;

    const { session } = await validateSessionToken(token);
    if (!session) return null;

    return {
        userId: session.userId,
        role: session.role,
        branchId: session.branchId,
    };
}

export async function requireAuth(): Promise<SessionData> {
    const session = await getSession();

    if (!session) {
        throw new Error("Unauthorized");
    }

    return session;
}

type Role = "executive" | "supervisor" | "back_office" | "sales_manager" | "logistics" | "hr" | "admin" | "superuser";

const ROLE_HIERARCHY: Record<Role, number> = {
    executive: 0,
    supervisor: 1,
    back_office: 1,
    sales_manager: 2,
    logistics: 2,
    hr: 2,
    admin: 3,
    superuser: 4,
};

export function hasRole(userRole: string, requiredRole: Role): boolean {
    const userLevel = ROLE_HIERARCHY[userRole as Role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 99;
    return userLevel >= requiredLevel;
}

export async function requireRole(role: Role) {
    const session = await requireAuth();
    if (!hasRole(session.role, role)) {
        throw new Error("Forbidden");
    }
    return session;
}
