import type { Role } from "~/domain/auth/access/rbac";

// Generate a deterministic 32-character session token from a seed.
function token32(seed: string): string {
  const base = seed.replace(/[^a-z2-7]/g, "");

  return base.repeat(Math.ceil(32 / base.length)).slice(0, 32);
}

export interface RosterUser {
  key: string;
  userId: string;
  username: string;
  email: string;
  role: Role;
  token: string;
}

function rosterUser(
  key: string,
  userId: string,
  username: string,
  role: Role,
): RosterUser {
  return {
    key,
    userId,
    username,
    email: `${username}@e2e.local`,
    role,
    token: token32(key.replaceAll("_", "")),
  };
}

export const ROSTER = [
  rosterUser(
    "executive",
    "0e2e0000-0000-7000-8000-000000000001",
    "e2e.executive",
    "executive",
  ),
  rosterUser(
    "supervisor",
    "0e2e0000-0000-7000-8000-000000000002",
    "e2e.supervisor",
    "supervisor",
  ),
  rosterUser(
    "back_office",
    "0e2e0000-0000-7000-8000-000000000003",
    "e2e.backoffice",
    "back_office",
  ),
  rosterUser(
    "sales_manager",
    "0e2e0000-0000-7000-8000-000000000004",
    "e2e.manager",
    "sales_manager",
  ),
  rosterUser(
    "logistics",
    "0e2e0000-0000-7000-8000-000000000005",
    "e2e.logistics",
    "logistics",
  ),
  rosterUser("hr", "0e2e0000-0000-7000-8000-000000000006", "e2e.hr", "hr"),
  rosterUser(
    "admin",
    "0e2e0000-0000-7000-8000-000000000007",
    "e2e.admin",
    "admin",
  ),
  rosterUser(
    "superuser",
    "0e2e0000-0000-7000-8000-000000000008",
    "e2e.superuser",
    "superuser",
  ),
] as const satisfies readonly RosterUser[];

export type RosterKey = (typeof ROSTER)[number]["key"];

export function rosterByKey(key: RosterKey): RosterUser {
  const user = ROSTER.find((entry) => entry.key === key);

  if (!user) {
    throw new Error(`no e2e roster user for key '${key}'`);
  }

  return user;
}
