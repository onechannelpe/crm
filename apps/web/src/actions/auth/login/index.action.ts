import { redirect } from "@solidjs/router";

import type { PasskeyLoginFlowState } from "~/domain/auth/passkey/types";
import { fail, internal } from "~/domain/errors";
import { recordAuthAnalyticsEvent as recordAuthAnalytics } from "~/server/auth/auth-analytics";
import { completePendingLogin } from "~/server/auth/flows/complete-pending-login";
import { startPasskeyLogin } from "~/server/auth/flows/start-passkey-login";
import { submitPasswordLogin } from "~/server/auth/flows/submit-password-login";
import {
  verifyRecoveryLoginProof,
  verifyTotpLoginProof,
} from "~/server/auth/flows/verify-pending-login";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { executePublicServerFunction } from "~/server/platform/action";
import { throwDomain } from "~/server/platform/action/domain-error";
import { getAuthRuntime } from "~/server/platform/container/auth-runtime";
import { infra } from "~/server/platform/container/infra";
import { getRequestClientMetadata } from "~/server/platform/http/request-context";
import { getActionRequestContext } from "~/server/platform/observability/context";
import { isErr } from "~/shared/result";

import {
  completeLoginAndRedirect,
  readLoginFlowId,
  readLoginText,
  readPasskeyStartMode,
} from "./support.action";

function recordAuthAnalyticsEvent(
  event: Parameters<typeof recordAuthAnalytics>[0],
  context: Parameters<typeof recordAuthAnalytics>[1],
) {
  return recordAuthAnalytics(
    event,
    context,
    getAuthRuntime().analytics,
    infra.now,
  );
}

export async function passwordLogin(
  formData: FormData,
): Promise<{ nextStep: "passkey"; flow: PasskeyLoginFlowState }> {
  "use server";

  return executePublicServerFunction(async () => {
    const identifier = readLoginText(formData, "identifier");
    const password = readLoginText(formData, "password", { trim: false });
    const request = getRequestClientMetadata();
    const analyticsContext = getActionRequestContext();
    const loginContext = getAuthRuntime().login;

    const result = await submitPasswordLogin(
      {
        identifier,
        password,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      loginContext,
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
  "use server";

  return executePublicServerFunction(async () => {
    const mode = readPasskeyStartMode(formData);

    if (!mode) {
      throwDomain(internal("Invalid passkey login mode"));
    }

    const request = getRequestClientMetadata();
    const analyticsContext = getActionRequestContext();
    const loginContext = getAuthRuntime().login;

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
      loginContext,
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
  "use server";

  return executePublicServerFunction(async () => {
    const flowId = readLoginFlowId(formData, "flowId");
    const totpCode = readLoginText(formData, "totpCode");

    if (!flowId) {
      throwDomain(fail("flow_expired"));
    }

    const request = getRequestClientMetadata();
    const analyticsContext = getActionRequestContext();
    const loginContext = getAuthRuntime().login;

    const verifiedAt = loginContext.now();
    const verified = await verifyTotpLoginProof(loginContext, {
      flowId,
      totpCode,
      ipAddress: request.ipAddress,
      occurredAt: verifiedAt,
    });

    if (isErr(verified)) {
      if (verified.error.kind === "flow_expired") {
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

    const completed = await completePendingLogin(loginContext, {
      proof: verified.value,
      occurredAt: verifiedAt,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    });
    if (isErr(completed)) {
      throwDomain(
        fail(
          completed.error.kind === "flow_expired"
            ? "flow_expired"
            : "totp_code_invalid",
        ),
      );
    }

    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "totp_result",
        outcome: "succeeded",
      },
      analyticsContext,
    );

    return completeLoginAndRedirect(completed.value);
  });
}

export async function recoveryLogin(formData: FormData): Promise<void> {
  "use server";

  return executePublicServerFunction(async () => {
    const flowId = readLoginFlowId(formData, "flowId");
    const recoveryCode = readLoginText(formData, "recoveryCode");

    if (!flowId) {
      throwDomain(fail("flow_expired"));
    }

    const request = getRequestClientMetadata();
    const loginContext = getAuthRuntime().login;

    const verifiedAt = loginContext.now();
    const verified = await verifyRecoveryLoginProof(loginContext, {
      flowId,
      recoveryCode,
      ipAddress: request.ipAddress,
      occurredAt: verifiedAt,
    });

    if (isErr(verified)) {
      throwDomain(
        fail(
          verified.error.kind === "flow_expired"
            ? "flow_expired"
            : "recovery_code_invalid",
        ),
      );
    }

    const completed = await completePendingLogin(loginContext, {
      proof: verified.value,
      occurredAt: verifiedAt,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    });
    if (isErr(completed)) {
      throwDomain(
        fail(
          completed.error.kind === "flow_expired"
            ? "flow_expired"
            : "recovery_code_invalid",
        ),
      );
    }

    return completeLoginAndRedirect(completed.value);
  });
}
