"use server";

import { redirect } from "@solidjs/router";

import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import type { PasskeyLoginFlowState } from "~/lib/auth/passkey/types";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { getActionRequestContext } from "~/lib/observability/context";
import { startPasskeyLogin } from "~/server/auth/flows/start-passkey-login";
import { submitPasswordLogin } from "~/server/auth/flows/submit-password-login";
import { submitTotpForLoginFlow } from "~/server/auth/flows/submit-totp-login";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { getServerRuntime } from "~/server/runtime";
import { runPublicAction } from "~/server/shared/action-runtime";
import { fail, internal, throwDomain } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

import {
  completeLoginAndRedirect,
  readLoginFlowId,
  readLoginText,
  readPasskeyStartMode,
} from "./support";

export async function passwordLogin(
  formData: FormData,
): Promise<{ nextStep: "passkey"; flow: PasskeyLoginFlowState }> {
  return runPublicAction(async () => {
    const identifier = readLoginText(formData, "identifier");
    const password = readLoginText(formData, "password", { trim: false });
    const request = getRequestClientMetadata();
    const analyticsContext = getActionRequestContext();
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
      createRequestPasskeyProvider(loginContext.repos),
    );

    if (isErr(result)) {
      await recordAuthAnalyticsEvent(
        {
          source: "server",
          kind: "password_result",
          outcome: "failed",
          code: result.error.kind,
        },
        analyticsContext,
      );

      throwDomain(fail(result.error.kind));
    }

    if (result.value.kind === "totp_required") {
      await recordAuthAnalyticsEvent(
        {
          source: "server",
          kind: "password_result",
          outcome: "totp_required",
        },
        analyticsContext,
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
        analyticsContext,
      );

      return {
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
      analyticsContext,
    );

    return completeLoginAndRedirect(result.value.result);
  });
}

export async function passkeyStart(
  formData: FormData,
): Promise<{ flow: PasskeyLoginFlowState }> {
  return runPublicAction(async () => {
    const mode = readPasskeyStartMode(formData);

    if (!mode) {
      throwDomain(internal("Invalid passkey login mode"));
    }

    const request = getRequestClientMetadata();
    const analyticsContext = getActionRequestContext();
    const loginContext = getServerRuntime().auth.login;

    const command =
      mode === "identified"
        ? {
            identifier: readLoginText(formData, "identifier"),
            ipAddress: request.ipAddress,
            mode,
          }
        : {
            ipAddress: request.ipAddress,
            mode,
          };

    const result = await startPasskeyLogin(
      command,
      loginContext.repos,
      createRequestPasskeyProvider(loginContext.repos),
    );

    if (isErr(result)) {
      await recordAuthAnalyticsEvent(
        {
          source: "server",
          kind: "passkey_start_result",
          outcome: "failed",
          code: "invalid_credentials",
        },
        analyticsContext,
      );

      throwDomain(fail("invalid_credentials"));
    }

    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "passkey_start_result",
        outcome: "started",
      },
      analyticsContext,
    );

    return { flow: result.value };
  });
}

export async function totpLogin(formData: FormData): Promise<void> {
  return runPublicAction(async () => {
    const flowId = readLoginFlowId(formData, "flowId");
    const totpCode = readLoginText(formData, "totpCode");

    if (!flowId) {
      throwDomain(fail("flow_expired"));
    }

    const request = getRequestClientMetadata();
    const analyticsContext = getActionRequestContext();
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
          analyticsContext,
        );

        throwDomain(fail("flow_expired"));
      }

      await recordAuthAnalyticsEvent(
        {
          source: "server",
          kind: "totp_result",
          outcome: "failed",
          code: "invalid_totp",
        },
        analyticsContext,
      );

      throwDomain(fail("totp_code_invalid"));
    }

    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "totp_result",
        outcome: "succeeded",
      },
      analyticsContext,
    );

    return completeLoginAndRedirect(result.value.result);
  });
}
