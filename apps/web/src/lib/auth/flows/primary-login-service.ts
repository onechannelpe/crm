import { loadActiveAuthContext } from "~/lib/auth/context/auth-context";
import { evaluateLoginPolicy } from "~/lib/auth/policy/login-policy";
import type { AuthProof } from "~/lib/auth/policy/policy-types";
import { authenticatePassword } from "~/lib/auth/providers/password-provider";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { createPasskeyAuthService } from "../passkey/service";
import {
  issueLoginSession,
  type SessionRequestMetadata,
} from "../session/session-transition";
import { createTotpLoginFlow } from "./login-state-service";
import type { SubmitPrimaryLoginResult } from "./login-types";

type LoginFlowDeps = Pick<
  Repositories,
  | "loginFlows"
  | "users"
  | "sessions"
  | "auditLogs"
  | "authThrottle"
  | "authEvents"
  | "userTotpFactors"
  | "userTotpRecoveryCodes"
  | "passkeys"
  | "webauthnChallenges"
>;

export type SubmitPrimaryLoginError =
  | {
      kind: "invalid_credentials" | "strong_auth_required";
    }
  | {
      kind: "unexpected";
      message: string;
    };

async function completePrimaryAuthProof(params: {
  proof: AuthProof;
  identifier: string;
  request: SessionRequestMetadata;
  context?: Awaited<ReturnType<typeof loadActiveAuthContext>>;
  deps: LoginFlowDeps;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const context =
    params.context ??
    (await loadActiveAuthContext(params.proof.userId, params.deps));
  if (!context) {
    return Err({ kind: "invalid_credentials" });
  }

  const decision = evaluateLoginPolicy({
    proof: params.proof,
    context,
  });

  if (decision.kind === "deny") {
    return Err({ kind: decision.reason });
  }

  if (decision.kind === "require_totp") {
    return Ok({
      kind: "totp_required",
      flow: await createTotpLoginFlow(
        params.identifier,
        context.user.id,
        params.proof.kind,
        params.deps,
      ),
    });
  }

  if (decision.kind === "require_passkey") {
    const flow = await createPasskeyAuthService(params.deps).beginLogin({
      identifier: params.identifier,
      ipAddress: params.request.ipAddress,
      mode: "identified",
      primaryAuthMethod: params.proof.kind,
    });
    if (isErr(flow)) {
      if (flow.error.kind === "unexpected") {
        return Err(flow.error);
      }

      return Err({ kind: "invalid_credentials" });
    }

    return Ok({
      kind: "passkey_required",
      flow: flow.value,
    });
  }

  await sendAlertOnNewLoginSource({
    user: context.user,
    ipAddress: params.request.ipAddress,
    method: params.proof.kind,
    deps: params.deps,
    sendPrivilegedLoginAlert: params.sendPrivilegedLoginAlert,
  });

  const issued = await issueLoginSession({
    user: context.user,
    decision,
    request: params.request,
    primaryAuthMethod: params.proof.kind,
    auditAction: params.proof.kind === "passkey" ? "login_passkey" : "login",
    deps: params.deps,
  });

  return Ok({
    kind: "complete",
    result: {
      userId: issued.userId,
      role: issued.role,
      onboardingCompleted: issued.onboardingCompleted,
      token: issued.token,
    },
  });
}

export async function submitPasswordLogin(
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
    userAgent: string | null;
  },
  deps: LoginFlowDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const safeIdentifier = assertNonEmptyString(
    input.identifier,
    "identifier",
  ).trim();
  const proof = await authenticatePassword(
    {
      identifier: safeIdentifier,
      password: input.password,
      ipAddress: input.ipAddress,
    },
    deps,
  );
  if (isErr(proof)) {
    return Err(proof.error);
  }

  return completePrimaryAuthProof({
    proof: proof.value,
    identifier: safeIdentifier,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    deps,
    sendPrivilegedLoginAlert,
  });
}

export async function submitGoogleLogin(
  input: {
    userId: number;
    ipAddress: string;
    userAgent: string | null;
    trustedFederatedMfa?: boolean;
  },
  deps: LoginFlowDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const context = await loadActiveAuthContext(input.userId, deps);
  if (!context) {
    return Err({ kind: "invalid_credentials" });
  }

  return completePrimaryAuthProof({
    proof: {
      kind: "google",
      userId: context.user.id,
      trustedFederatedMfa: input.trustedFederatedMfa === true,
    },
    identifier: context.user.username,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    context,
    deps,
    sendPrivilegedLoginAlert,
  });
}
