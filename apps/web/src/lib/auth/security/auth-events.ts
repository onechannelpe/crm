import { hashAuthKey } from "~/lib/auth/password/key-hash";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { UserId } from "~/server/shared/ids";

type Deps = {
  authEvents: ReturnType<typeof createAuthEventsRepo>;
};

export type AuthEventMethod = "password" | "passkey" | "totp";
export type AuthEventStage = "login" | "challenge" | "verify" | "recovery";
export type AuthEventOutcome = "success" | "failure" | "throttled";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

interface AuthEventInput {
  userId: UserId | null;
  identifier: string;
  ipAddress: string;
  method: AuthEventMethod;
  stage: AuthEventStage;
  outcome: AuthEventOutcome;
  reason?: string | null;
}

export async function recordAuthEvent(
  deps: Deps,
  input: AuthEventInput,
): Promise<void> {
  await deps.authEvents.create({
    user_id: input.userId,
    method: input.method,
    stage: input.stage,
    outcome: input.outcome,
    reason: input.reason ?? null,
    identifier_hash: hashAuthKey(`id:${normalize(input.identifier)}`),
    ip_hash: hashAuthKey(`ip:${input.ipAddress}`),
    created_at: new Date(),
  });
}
