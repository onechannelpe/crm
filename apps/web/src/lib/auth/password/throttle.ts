import { db } from "~/lib/db/db";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createAuthThrottleService } from "~/server/features/auth/application/throttle-service";

type Deps = {
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
};

const defaultDeps = {
  authThrottle: createAuthThrottleRepo(db),
};

type CheckResult = { allowed: true } | { allowed: false; retryAfterMs: number };

function resolveThrottleService(deps?: Deps) {
  return createAuthThrottleService({
    authThrottle: deps?.authThrottle ?? defaultDeps.authThrottle,
  });
}

export async function checkLoginThrottle(
  email: string,
  ipAddress: string,
  deps?: Deps,
): Promise<CheckResult> {
  return resolveThrottleService(deps).checkLoginThrottle(email, ipAddress);
}

export async function recordLoginFailure(
  email: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await resolveThrottleService(deps).recordLoginFailure(email, ipAddress);
}

export async function clearLoginFailureState(
  email: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await resolveThrottleService(deps).clearLoginFailureState(email, ipAddress);
}

export async function checkPasskeyChallengeThrottle(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<CheckResult> {
  return resolveThrottleService(deps).checkPasskeyChallengeThrottle(
    identifier,
    ipAddress,
  );
}

export async function recordPasskeyChallengeFailure(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await resolveThrottleService(deps).recordPasskeyChallengeFailure(
    identifier,
    ipAddress,
  );
}

export async function checkPasskeyVerifyThrottle(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<CheckResult> {
  return resolveThrottleService(deps).checkPasskeyVerifyThrottle(
    identifier,
    ipAddress,
  );
}

export async function recordPasskeyVerifyFailure(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await resolveThrottleService(deps).recordPasskeyVerifyFailure(
    identifier,
    ipAddress,
  );
}

export async function clearPasskeyVerifyFailureState(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await resolveThrottleService(deps).clearPasskeyVerifyFailureState(
    identifier,
    ipAddress,
  );
}

export async function checkTotpVerifyThrottle(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<CheckResult> {
  return resolveThrottleService(deps).checkTotpVerifyThrottle(
    identifier,
    ipAddress,
  );
}

export async function recordTotpVerifyFailure(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await resolveThrottleService(deps).recordTotpVerifyFailure(
    identifier,
    ipAddress,
  );
}

export async function clearTotpVerifyFailureState(
  identifier: string,
  ipAddress: string,
  deps?: Deps,
): Promise<void> {
  await resolveThrottleService(deps).clearTotpVerifyFailureState(
    identifier,
    ipAddress,
  );
}
