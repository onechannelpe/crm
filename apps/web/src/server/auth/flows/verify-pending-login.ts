import type { AuthLoginFlowId, UserId } from "~/domain/ids";
import { verifyRecoveryCode } from "~/server/auth/factors/recovery";
import { verifyTotpStepUp } from "~/server/auth/factors/totp";
import type { AuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { deleteLoginFlow } from "~/server/auth/login-flow/shared";
import { Err, isErr, Ok, type Result } from "~/shared/result";

type PendingLogin = {
  flow: NonNullable<
    Awaited<ReturnType<AuthLoginContext["repos"]["loginFlows"]["findById"]>>
  >;
  user: NonNullable<
    Awaited<ReturnType<AuthLoginContext["repos"]["users"]["findById"]>>
  >;
};

async function loadPendingLogin(
  deps: AuthLoginContext,
  flowId: AuthLoginFlowId,
  occurredAt: Date,
): Promise<Result<PendingLogin, { kind: "flow_expired" }>> {
  const flow = await deps.repos.loginFlows.findById(flowId);
  if (!flow || flow.expires_at < occurredAt || !flow.user_id) {
    await deleteLoginFlow(flow, deps.repos);
    return Err({ kind: "flow_expired" });
  }

  const user = await deps.repos.users.findById(flow.user_id);
  if (!user?.is_active) {
    await deps.repos.loginFlows.delete(flow.id);
    return Err({ kind: "flow_expired" });
  }

  return Ok({ flow, user });
}

export interface VerifiedTotpLoginProof {
  method: "totp";
  flowId: AuthLoginFlowId;
  userId: UserId;
  secretEncrypted: string;
}

export async function verifyTotpLoginProof(
  deps: AuthLoginContext,
  input: {
    flowId: AuthLoginFlowId;
    totpCode: string;
    ipAddress: string;
    occurredAt: Date;
  },
): Promise<
  Result<VerifiedTotpLoginProof, { kind: "flow_expired" | "invalid_totp" }>
> {
  const pending = await loadPendingLogin(deps, input.flowId, input.occurredAt);
  if (isErr(pending)) return pending;
  if (pending.value.flow.state !== "totp") {
    await deps.repos.loginFlows.delete(pending.value.flow.id);
    return Err({ kind: "flow_expired" });
  }

  const verified = await verifyTotpStepUp({
    user: pending.value.user,
    ipAddress: input.ipAddress,
    totpCode: input.totpCode,
    deps: deps.repos,
    occurredAt: input.occurredAt,
  });
  if (isErr(verified)) return verified;

  return Ok({
    method: "totp",
    flowId: pending.value.flow.id,
    userId: pending.value.user.id,
    secretEncrypted: verified.value.secretEncrypted,
  });
}

export interface VerifiedRecoveryLoginProof {
  method: "recovery";
  codeHash: string;
  flowId: AuthLoginFlowId;
  userId: UserId;
}

export async function verifyRecoveryLoginProof(
  deps: AuthLoginContext,
  input: {
    flowId: AuthLoginFlowId;
    recoveryCode: string;
    ipAddress: string;
    occurredAt: Date;
  },
): Promise<
  Result<
    VerifiedRecoveryLoginProof,
    { kind: "flow_expired" | "invalid_recovery" }
  >
> {
  const pending = await loadPendingLogin(deps, input.flowId, input.occurredAt);
  if (isErr(pending)) return pending;

  const verified = await verifyRecoveryCode({
    user: pending.value.user,
    ipAddress: input.ipAddress,
    recoveryCode: input.recoveryCode,
    deps: deps.repos,
    occurredAt: input.occurredAt,
  });
  if (isErr(verified)) return verified;

  return Ok({
    method: "recovery",
    codeHash: verified.value.codeHash,
    flowId: pending.value.flow.id,
    userId: pending.value.user.id,
  });
}
