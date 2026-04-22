"use server";

import { redirect } from "@solidjs/router";

import type {
  PasskeyStartSubmissionResult,
  PasswordLoginSubmissionResult,
} from "~/actions/auth/contracts";
import { internalError } from "~/lib/app-errors";
import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { getActionRequestContext } from "~/lib/observability/context";
import { startPasskeyLogin } from "~/server/auth/application/commands/start-passkey-login";
import { submitPasswordLogin } from "~/server/auth/application/commands/submit-password-login";
import { submitTotpForLoginFlow } from "~/server/auth/application/commands/submit-totp-login";
import { createRequestPasskeyProviderFactory } from "~/server/auth/infrastructure/request-passkey-provider";
import { getServerRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";

import {
  completeLoginAndRedirect,
  normalizePasskeyStartError,
  normalizePasswordLoginError,
  readLoginFlowId,
  readLoginText,
  readPasskeyStartMode,
  resolvePasskeyStartAnalyticsCode,
  resolvePasswordAnalyticsCode,
} from "./support";

export type TotpLoginSubmissionResult = {
  ok: false;
  code: "invalid_totp";
};

export async function passwordLogin(
  formData: FormData,
): Promise<PasswordLoginSubmissionResult> {
  const identifier = readLoginText(formData, "identifier");
  const password = readLoginText(formData, "password", { trim: false });
  const request = getRequestClientMetadata();
  const loginContext = getServerRuntime().auth.login;
  const result = await submitPasswordLogin(
    {
      identifier,
      password,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    loginContext.repos,
    loginContext.privilegedLoginAlertSender,
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
  const mode = readPasskeyStartMode(formData);
  if (!mode) {
    throw internalError("Invalid passkey login mode");
  }

  const request = getRequestClientMetadata();
  const loginContext = getServerRuntime().auth.login;
  const result =
    mode === "identified"
      ? await startPasskeyLogin(
          {
            identifier: readLoginText(formData, "identifier"),
            ipAddress: request.ipAddress,
            mode,
          },
          loginContext.repos,
          {
            createWebauthnProvider: createRequestPasskeyProviderFactory(),
          },
        )
      : await startPasskeyLogin(
          {
            ipAddress: request.ipAddress,
            mode,
          },
          loginContext.repos,
          {
            createWebauthnProvider: createRequestPasskeyProviderFactory(),
          },
        );
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
  const flowId = readLoginFlowId(formData, "flowId");
  const totpCode = readLoginText(formData, "totpCode");
  if (!flowId) {
    throw redirect("/login/user?error=flow_expired");
  }
  const request = getRequestClientMetadata();
  const loginContext = getServerRuntime().auth.login;
  const result = await submitTotpForLoginFlow(
    {
      flowId,
      totpCode,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    loginContext.repos,
    loginContext.privilegedLoginAlertSender,
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
