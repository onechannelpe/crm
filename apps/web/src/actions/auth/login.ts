"use server";

import { redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

import { internalError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import {
  submitPasswordLogin,
  submitTotpForLoginFlow,
} from "~/lib/auth/login-flow";
import { parseLoginFlowId } from "~/lib/auth/login-route-flow";
import {
  createPasskeyAuthService,
  type PasskeyLoginFlowState,
  type BeginPasskeyLoginError,
} from "~/lib/auth/passkey/service";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { replaceCurrentSession } from "~/lib/auth/session/login-completion";
import { getActionRequestContext } from "~/lib/observability/context";
import { privilegedLoginAlertSender, repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export type PasswordLoginSubmissionResult =
  | {
      ok: false;
      code: "invalid_credentials" | "strong_auth_required";
    }
  | {
      ok: true;
      nextStep: "passkey";
      flow: PasskeyLoginFlowState;
    };

export type PasskeyStartSubmissionResult =
  | {
      ok: false;
      code: "invalid_credentials";
    }
  | {
      ok: true;
      flow: PasskeyLoginFlowState;
    };

export type TotpLoginSubmissionResult = {
  ok: false;
  code: "invalid_totp";
};

function readText(
  formData: FormData,
  field: "identifier" | "password" | "totpCode",
  options?: { trim?: boolean },
): string {
  const value = formData.get(field);
  if (typeof value !== "string") return "";
  return options?.trim === false ? value : value.trim();
}

function readPositiveInt(formData: FormData, field: "flowId"): number | null {
  const value = formData.get(field);
  return typeof value === "string" ? parseLoginFlowId(value) : null;
}

async function completeLoginAndRedirect(result: {
  token: string;
  role: Role;
  onboardingCompleted: boolean;
}): Promise<never> {
  await replaceCurrentSession(result.token);
  throw redirect(
    result.onboardingCompleted ? getDefaultAppPath(result.role) : "/onboarding",
  );
}

function getRequestContext() {
  const event = getRequestEvent();

  return {
    ipAddress: getClientIp(event?.request.headers ?? new Headers()),
    userAgent: event?.request.headers.get("user-agent") ?? null,
  };
}

function normalizePasskeyStartError(
  error: BeginPasskeyLoginError,
): PasskeyStartSubmissionResult {
  if (error.kind === "unexpected") {
    throw internalError(error.message);
  }
  return {
    ok: false,
    code: "invalid_credentials",
  };
}

function resolvePasskeyStartAnalyticsCode(
  error: BeginPasskeyLoginError,
): "invalid_credentials" | "internal" {
  return error.kind === "unexpected" ? "internal" : "invalid_credentials";
}

function normalizePasswordLoginError(error: {
  kind: "invalid_credentials" | "strong_auth_required" | "unexpected";
  message?: string;
}): PasswordLoginSubmissionResult {
  if (error.kind === "unexpected") {
    throw internalError(error.message ?? "Unexpected password login failure");
  }

  return {
    ok: false,
    code: error.kind,
  };
}

function resolvePasswordAnalyticsCode(error: {
  kind: "invalid_credentials" | "strong_auth_required" | "unexpected";
}): "invalid_credentials" | "strong_auth_required" | "internal" {
  return error.kind === "unexpected" ? "internal" : error.kind;
}

export async function passwordLogin(
  formData: FormData,
): Promise<PasswordLoginSubmissionResult> {
  const identifier = readText(formData, "identifier");
  const password = readText(formData, "password", { trim: false });
  const request = getRequestContext();
  const result = await submitPasswordLogin(
    {
      identifier,
      password,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    repos,
    privilegedLoginAlertSender,
  );
  if (isErr(result)) {
    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "password_result",
        outcome: "failed",
        code: resolvePasswordAnalyticsCode(result.error),
      },
      getActionRequestContext(),
    );
    return normalizePasswordLoginError(result.error);
  }

  if (result.value.kind === "totp_required") {
    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "password_result",
        outcome: "totp_required",
      },
      getActionRequestContext(),
    );
    throw redirect(`/login/verify?flow=${result.value.flow.id}`);
  }
  if (result.value.kind === "passkey_required") {
    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "password_result",
        outcome: "passkey_required",
      },
      getActionRequestContext(),
    );
    return {
      ok: true,
      nextStep: "passkey",
      flow: result.value.flow,
    };
  }

  await recordAuthAnalyticsEvent(
    {
      source: "server",
      kind: "password_result",
      outcome: "succeeded",
    },
    getActionRequestContext(),
  );
  return await completeLoginAndRedirect(result.value.result);
}

export async function passkeyStart(
  formData: FormData,
): Promise<PasskeyStartSubmissionResult> {
  const identifier = readText(formData, "identifier");
  const request = getRequestContext();
  const service = createPasskeyAuthService(repos);
  const result = await service.beginLogin({
    identifier,
    ipAddress: request.ipAddress,
  });
  if (isErr(result)) {
    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "passkey_start_result",
        outcome: "failed",
        code: resolvePasskeyStartAnalyticsCode(result.error),
      },
      getActionRequestContext(),
    );
    return normalizePasskeyStartError(result.error);
  }

  await recordAuthAnalyticsEvent(
    {
      source: "server",
      kind: "passkey_start_result",
      outcome: "started",
    },
    getActionRequestContext(),
  );
  return {
    ok: true,
    flow: result.value,
  };
}

export async function totpLogin(
  formData: FormData,
): Promise<TotpLoginSubmissionResult> {
  const flowId = readPositiveInt(formData, "flowId");
  const totpCode = readText(formData, "totpCode");
  if (!flowId) {
    throw redirect("/login/user?error=flow_expired");
  }
  const request = getRequestContext();
  const result = await submitTotpForLoginFlow(
    {
      flowId,
      totpCode,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    repos,
    privilegedLoginAlertSender,
  );
  if (isErr(result)) {
    if (result.error.kind === "flow_expired") {
      await recordAuthAnalyticsEvent(
        {
          source: "server",
          kind: "totp_result",
          outcome: "failed",
          code: "flow_expired",
        },
        getActionRequestContext(),
      );
      throw redirect("/login/user?error=flow_expired");
    }

    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "totp_result",
        outcome: "failed",
        code: "invalid_totp",
      },
      getActionRequestContext(),
    );
    return {
      ok: false,
      code: "invalid_totp",
    };
  }

  await recordAuthAnalyticsEvent(
    {
      source: "server",
      kind: "totp_result",
      outcome: "succeeded",
    },
    getActionRequestContext(),
  );
  return await completeLoginAndRedirect(result.value.result);
}
