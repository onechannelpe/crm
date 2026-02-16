import { assertNonEmptyString } from "~/lib/contracts/guards";
import { verifyPassword } from "./password";
import { createSession } from "../session/session-manager";
import {
  checkLoginThrottle,
  clearLoginFailureState,
  recordLoginFailure,
} from "./throttle";
import { repos } from "~/server/shared/context";
import type { Role } from "../access/rbac";
import type { Repositories } from "~/server/shared/registry";

const INVALID_CREDENTIALS = "Invalid credentials";

type Deps = Pick<
  Repositories,
  "users" | "sessions" | "auditLogs" | "authThrottle"
>;

export interface PasswordLoginInput {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string | null;
}

export interface PasswordLoginResult {
  userId: number;
  role: Role;
  token: string;
}

export async function authenticatePasswordLogin(
  input: PasswordLoginInput,
  deps?: Deps,
): Promise<PasswordLoginResult> {
  const safeEmail = assertNonEmptyString(input.email, "email");
  const safePassword = assertNonEmptyString(input.password, "password");
  const resolvedDeps = deps ?? repos;
  const throttle = await checkLoginThrottle(
    safeEmail,
    input.ipAddress,
    resolvedDeps,
  );

  if (!throttle.allowed) throw new Error(INVALID_CREDENTIALS);

  const user = await resolvedDeps.users.findByEmail(safeEmail);

  if (!user || !user.is_active) {
    await recordLoginFailure(safeEmail, input.ipAddress, resolvedDeps);
    throw new Error(INVALID_CREDENTIALS);
  }

  if (!(await verifyPassword(user.password_hash, safePassword))) {
    await recordLoginFailure(safeEmail, input.ipAddress, resolvedDeps);
    throw new Error(INVALID_CREDENTIALS);
  }

  await clearLoginFailureState(safeEmail, input.ipAddress, resolvedDeps);

  const token = await createSession(
    user.id,
    user.branch_id,
    user.role,
    input.ipAddress,
    input.userAgent,
    resolvedDeps,
  );

  await resolvedDeps.auditLogs.create({
    user_id: user.id,
    action: "login",
    entity_type: "user",
    entity_id: user.id,
    changes: null,
    created_at: Date.now(),
  });
  
  return { userId: user.id, role: user.role, token };
}
